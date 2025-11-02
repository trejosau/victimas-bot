// index.js (ESM)
// Monitor de canales: ignora autores con ciertos roles y reenvía todo al webhook.

import https from 'node:https';
import { Client } from 'discord.js-selfbot-v13';
import { CONFIG as config } from './config.js';

const client = new Client();

// ====== HTTP webhook ======
function postWebhookJson(webhookUrl, body) {
    return new Promise((resolve, reject) => {
        try {
            const url = new URL(webhookUrl);
            const payload = Buffer.from(JSON.stringify(body));
            const req = https.request(
                {
                    hostname: url.hostname,
                    path: url.pathname + url.search,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': payload.length,
                    },
                },
                (res) => {
                    let data = '';
                    res.on('data', (chunk) => (data += chunk));
                    res.on('end', () => {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve({ status: res.statusCode, body: data });
                        } else {
                            reject(new Error(`Webhook HTTP ${res.statusCode}: ${data}`));
                        }
                    });
                }
            );
            req.on('error', reject);
            req.write(payload);
            req.end();
        } catch (e) {
            reject(e);
        }
    });
}

// ====== Helpers ======
function isImageUrl(url) {
    return /\.(png|jpe?g|gif|webp|bmp|tiff)$/i.test(url || '');
}
function isImageAttachment(att) {
    const ct = (att.contentType || att.content_type || '').toLowerCase();
    if (ct.startsWith?.('image/')) return true;
    return isImageUrl(att.url);
}
function chunkText(str, max = 4096) {
    if (!str) return [];
    const out = [];
    for (let i = 0; i < str.length; i += max) out.push(str.slice(i, i + max));
    return out;
}
function messageLink(guildId, channelId, messageId) {
    return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}
function isMonitoredChannel(channel) {
    if (!channel || (channel.type !== 0 && channel.type !== 'GUILD_TEXT')) return false;
    if (!config.MONITOR_CHANNEL_IDS.includes(channel.id)) return false;
    if (String(channel.parentId || '') !== String(config.MONITOR_CATEGORY_ID)) return false;
    return true;
}
async function authorHasIgnoredRole(message) {
    try {
        if (!message.guild) return false;
        const member =
            message.member ||
            (await message.guild.members.fetch(message.author.id).catch(() => null));
        if (!member) return false;
        const ids = new Set(config.MONITOR_IGNORE_ROLE_IDS.map(String));
        for (const [roleId] of member.roles.cache) {
            if (ids.has(String(roleId))) return true;
        }
        return false;
    } catch {
        return false;
    }
}

// Extrae cualquier URL de imagen que venga escondida dentro del objeto embed.
function extractImageUrlsFromEmbedObject(embedObj) {
    const urls = new Set();

    // Canales normales del embed
    const direct = [
        embedObj?.image?.url,
        embedObj?.thumbnail?.url,
        embedObj?.video?.url,
        embedObj?.url,
    ].filter(Boolean);
    direct.forEach((u) => { if (isImageUrl(u)) urls.add(u); });

    // Fallback: buscar en el JSON del embed
    try {
        const raw = JSON.stringify(embedObj);
        const re = /(https?:\/\/(?:media|cdn)\.discordapp\.(?:net|com)\/[^\s"']+\.(?:png|jpe?g|gif|webp|bmp|tiff))/gi;
        let m;
        while ((m = re.exec(raw)) !== null) urls.add(m[1]);
    } catch { /* ignore */ }

    return [...urls];
}

function collectEmbedsAndFilesFromMessage(message, embedColor) {
    const embeds = [];
    const files = [];

    // Adjuntos
    if (message.attachments?.size > 0) {
        for (const [, att] of message.attachments) {
            if (isImageAttachment(att)) {
                embeds.push({ color: embedColor, image: { url: att.url } });
            } else {
                files.push({ name: att.name || 'archivo', url: att.url });
            }
        }
    }

    // Embeds del mensaje (imágenes directas + extraídas del JSON)
    if (Array.isArray(message.embeds) && message.embeds.length > 0) {
        for (const e of message.embeds) {
            const found = extractImageUrlsFromEmbedObject(e);
            for (const url of found) {
                embeds.push({ color: embedColor, image: { url } });
            }
        }
    }

    return { embeds, files };
}

function buildPrimaryEmbeds({ message, titlePrefix, msgUrl, fileLinks, embedColor }) {
    const username = message.author.username || 'Usuario';
    const disc = message.author.discriminator;
    const tag = disc && disc !== '0' ? `${username}#${disc}` : `@${username}`;

    const authorIcon = message.author.displayAvatarURL
        ? message.author.displayAvatarURL({ format: 'png', size: 128 })
        : undefined;

    const baseDesc = [];
    if (message.content?.trim()) baseDesc.push(message.content.trim());
    if (fileLinks.length > 0) {
        baseDesc.push(
            `**Archivos:**\n${fileLinks.map((f) => `• [${f.name}](${f.url})`).join('\n')}`
        );
    }
    baseDesc.push(`[Ir al mensaje](${msgUrl})`);

    const desc = baseDesc.join('\n\n');
    const chunks = chunkText(desc, 4096);

    const head = {
        color: embedColor,
        author: {
            name: `${titlePrefix ? `${titlePrefix} · ` : ''}${tag} (${message.author.id})`,
            ...(authorIcon ? { icon_url: authorIcon } : {}),
        },
        description: chunks[0] || '(sin contenido)',
        footer: {
            text: `#${message.channel?.name || 'desconocido'} • ${message.guild?.name || 'Unknown'}`,
        },
        timestamp: new Date(message.createdTimestamp || Date.now()).toISOString(),
    };

    const out = [head];
    for (let i = 1; i < chunks.length; i++) {
        out.push({ color: embedColor, description: chunks[i] });
    }
    return out;
}

// ====== Runtime ======
client.on('ready', () => {
    console.log(`✅ Conectado como ${client.user.tag}`);
    console.log('🔍 Reenviando mensajes si el autor NO tiene roles ignorados…');
    console.log(`📁 Categoría: ${config.MONITOR_CATEGORY_ID}`);
    console.log(`#️⃣ Canales: ${config.MONITOR_CHANNEL_IDS.join(', ')}`);
    console.log(`🚫 Ignorar roles: ${config.MONITOR_IGNORE_ROLE_IDS.join(', ')}`);
});

client.on('messageCreate', async (message) => {
    try {
        if (!message.guild || message.author?.bot) return;
        if (!isMonitoredChannel(message.channel)) return;
        if (message.author?.id === client.user?.id) return;

        // Asegura datos completos por si vienen parciales
        if (message.partial && message.fetch) {
            await message.fetch().catch(() => {});
        }

        // Ignorar si el autor tiene alguno de los roles prohibidos
        if (await authorHasIgnoredRole(message)) return;

        // Construir mención + enlace
        const pingUser = `<@${message.author.id}>`;
        const msgUrl = messageLink(message.guild.id, message.channel.id, message.id);

        // Contenido e imágenes del propio mensaje
        const { embeds: msgImageEmbeds, files: msgFileLinks } =
            collectEmbedsAndFilesFromMessage(message, config.MONITOR_EMBED_COLOR);

        // Si es reply/forward, intenta traer el mensaje referenciado y adjuntar su contenido
        let refEmbeds = [];
        try {
            if (message.reference || message.mentions?.repliedUser) {
                const ref = await message.fetchReference().catch(() => null);
                if (ref) {
                    // Asegura datos del referenciado
                    if (ref.partial && ref.fetch) await ref.fetch().catch(() => {});
                    const { embeds: refImgs, files: refFiles } =
                        collectEmbedsAndFilesFromMessage(ref, config.MONITOR_EMBED_COLOR);

                    // Embeds “primarios” para el referenciado (texto + links + ir al mensaje original)
                    const refUrl = messageLink(ref.guild?.id || message.guild.id, ref.channel?.id || message.channel.id, ref.id);
                    const refPrimary = buildPrimaryEmbeds({
                        message: ref,
                        titlePrefix: 'Reenvío/Reply de',
                        msgUrl: refUrl,
                        fileLinks: refFiles,
                        embedColor: config.MONITOR_EMBED_COLOR,
                    });

                    refEmbeds = [...refPrimary, ...refImgs];
                }
            }
        } catch { /* noop */ }

        // Embeds “primarios” del mensaje actual
        const msgPrimary = buildPrimaryEmbeds({
            message,
            titlePrefix: '',
            msgUrl,
            fileLinks: msgFileLinks,
            embedColor: config.MONITOR_EMBED_COLOR,
        });

        // Orden: texto del mensaje actual -> imágenes del mensaje actual -> bloques del referenciado
        let embeds = [...msgPrimary, ...msgImageEmbeds, ...refEmbeds];

        // Límite de 10
        if (embeds.length > 10) {
            embeds = embeds.slice(0, 9);
            embeds.push({
                color: config.MONITOR_EMBED_COLOR,
                description: `Se alcanzó el límite de 10 embeds. (Contenido truncado)`,
            });
        }

        // Enviar
        const body = {
            content: pingUser,
            allowed_mentions: { users: [message.author.id] },
            embeds,
        };

        await postWebhookJson(config.MONITOR_WEBHOOK_URL, body);
        console.log(`📤 Reenviado: ${message.author.tag} → webhook`);
    } catch (err) {
        console.error('❌ Error reenviando al webhook:', err?.message || err);
    }
});

client.on('error', console.error);
process.on('unhandledRejection', console.error);

if (!config?.TOKEN) {
    console.error('❌ Falta TOKEN en ./config.js');
    process.exit(1);
}
client.login(config.TOKEN);
