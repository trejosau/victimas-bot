// index.js (ESM)
// Monitor de canales: víctimas (trades/crosstrade) + tickets (📩mm-*)
// Ignora autores con ciertos roles y reenvía al webhook correspondiente.

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

// ====== Helpers comunes ======
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

// Extrae URLs de imagen dentro de un embed
function extractImageUrlsFromEmbedObject(embedObj) {
    const urls = new Set();

    const direct = [
        embedObj?.image?.url,
        embedObj?.thumbnail?.url,
        embedObj?.video?.url,
        embedObj?.url,
    ].filter(Boolean);
    direct.forEach((u) => {
        if (isImageUrl(u)) urls.add(u);
    });

    try {
        const raw = JSON.stringify(embedObj);
        const re =
            /(https?:\/\/(?:media|cdn)\.discordapp\.(?:net|com)\/[^\s"']+\.(?:png|jpe?g|gif|webp|bmp|tiff))/gi;
        let m;
        while ((m = re.exec(raw)) !== null) urls.add(m[1]);
    } catch {
        /* ignore */
    }

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

function buildPrimaryEmbeds({ message, titlePrefix, msgUrl, fileLinks, embedColor, footerPrefix }) {
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
            text: `${footerPrefix || ''}#${message.channel?.name || 'desconocido'} • ${
                message.guild?.name || 'Unknown'
            }`,
        },
        timestamp: new Date(message.createdTimestamp || Date.now()).toISOString(),
    };

    const out = [head];
    for (let i = 1; i < chunks.length; i++) {
        out.push({ color: embedColor, description: chunks[i] });
    }
    return out;
}

// ====== Filtros por tipo de canal ======
function isVictimChannel(channel) {
    if (!channel || (channel.type !== 0 && channel.type !== 'GUILD_TEXT')) return false;
    if (!config.MONITOR_CATEGORY_ID || !config.MONITOR_CHANNEL_IDS.length) return false;
    if (!config.MONITOR_CHANNEL_IDS.includes(channel.id)) return false;
    if (String(channel.parentId || '') !== String(config.MONITOR_CATEGORY_ID)) return false;
    return true;
}

function isTicketChannel(channel) {
    if (!channel || (channel.type !== 0 && channel.type !== 'GUILD_TEXT')) return false;
    if (!config.TICKETS_CATEGORY_ID || !config.TICKETS_CHANNEL_PREFIXES.length) return false;
    if (String(channel.parentId || '') !== String(config.TICKETS_CATEGORY_ID)) return false;
    const name = (channel.name || '').toLowerCase();
    const prefixes = config.TICKETS_CHANNEL_PREFIXES.map((p) => p.toLowerCase());
    return prefixes.some((p) => name.startsWith(p));
}

// ====== Estado tickets ======
const reportedTicketChannels = new Set();   // channel.id ya reportado
const ticketParticipants = new Map();       // channel.id -> Set<userId>

// ====== Handlers ======
async function handleVictimMessage(message) {
    // Ignora si tiene rol objetivo
    if (await authorHasIgnoredRole(message)) return;

    const pingUser = `<@${message.author.id}>`;
    const msgUrl = messageLink(message.guild.id, message.channel.id, message.id);

    const { embeds: msgImageEmbeds, files: msgFileLinks } =
        collectEmbedsAndFilesFromMessage(message, config.MONITOR_EMBED_COLOR);

    // Mensaje referenciado (reply / forward)
    let refEmbeds = [];
    try {
        if (message.reference || message.mentions?.repliedUser) {
            const ref = await message.fetchReference().catch(() => null);
            if (ref) {
                if (ref.partial && ref.fetch) await ref.fetch().catch(() => {});
                const { embeds: refImgs, files: refFiles } =
                    collectEmbedsAndFilesFromMessage(ref, config.MONITOR_EMBED_COLOR);

                const refUrl = messageLink(
                    ref.guild?.id || message.guild.id,
                    ref.channel?.id || message.channel.id,
                    ref.id
                );
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
    } catch {
        /* ignore */
    }

    const msgPrimary = buildPrimaryEmbeds({
        message,
        titlePrefix: '',
        msgUrl,
        fileLinks: msgFileLinks,
        embedColor: config.MONITOR_EMBED_COLOR,
    });

    let embeds = [...msgPrimary, ...msgImageEmbeds, ...refEmbeds];
    if (embeds.length > 10) {
        embeds = embeds.slice(0, 9);
        embeds.push({
            color: config.MONITOR_EMBED_COLOR,
            description: 'Se alcanzó el límite de 10 embeds. (Contenido truncado)',
        });
    }

    const body = {
        content: pingUser,
        allowed_mentions: { users: [message.author.id] },
        embeds,
    };

    await postWebhookJson(config.MONITOR_WEBHOOK_URL, body);
    console.log(`📤 [víctimas] Reenviado: ${message.author.tag} → webhook`);
}

async function handleTicketMessage(message) {
    const chId = message.channel.id;

    // registrar participantes (incluye MMs, bots no)
    if (!ticketParticipants.has(chId)) ticketParticipants.set(chId, new Set());
    if (!message.author.bot) {
        ticketParticipants.get(chId).add(message.author.id);
    }

    // si tiene rol ignorado, no es víctima pero sí queda como participante
    if (await authorHasIgnoredRole(message)) return;

    // si ya reportamos este ticket, no repetir
    if (reportedTicketChannels.has(chId)) return;
    reportedTicketChannels.add(chId);

    const victimId = message.author.id;
    const victimMention = `<@${victimId}>`;

    const participantsIds = Array.from(ticketParticipants.get(chId) || []);
    const participantsMentions =
        participantsIds.length > 0
            ? participantsIds.map((id) => `<@${id}>`).join(' ')
            : '(sin participantes)';

    const headerContent = `Victima: ${victimMention}\nUsuarios: ${participantsMentions}`;

    const msgUrl = messageLink(message.guild.id, chId, message.id);
    const { embeds: imgEmbeds, files: fileLinks } =
        collectEmbedsAndFilesFromMessage(message, config.MONITOR_EMBED_COLOR);
    const primaryEmbeds = buildPrimaryEmbeds({
        message,
        titlePrefix: '',
        msgUrl,
        fileLinks,
        embedColor: config.MONITOR_EMBED_COLOR,
        footerPrefix: 'Ticket · ',
    });

    let embeds = [...primaryEmbeds, ...imgEmbeds];
    if (embeds.length > 10) {
        embeds = embeds.slice(0, 9);
        embeds.push({
            color: config.MONITOR_EMBED_COLOR,
            description: 'Se alcanzó el límite de 10 embeds. (Contenido truncado)',
        });
    }

    const body = {
        content: headerContent,
        allowed_mentions: { users: participantsIds },
        embeds,
    };

    await postWebhookJson(config.TICKETS_WEBHOOK_URL, body);
    console.log(`📤 [tickets] Reportado ticket ${message.channel.name} → webhook`);
}

// ====== Runtime ======
client.on('ready', () => {
    console.log(`✅ Conectado como ${client.user.tag}`);

    if (config.MONITOR_WEBHOOK_URL) {
        console.log('🔍 [víctimas] Activo');
        console.log(`   Categoría: ${config.MONITOR_CATEGORY_ID}`);
        console.log(`   Canales: ${config.MONITOR_CHANNEL_IDS.join(', ')}`);
    }

    if (config.TICKETS_WEBHOOK_URL) {
        console.log('🔍 [tickets] Activo');
        console.log(`   Categoría: ${config.TICKETS_CATEGORY_ID}`);
        console.log(`   Prefijos: ${config.TICKETS_CHANNEL_PREFIXES.join(', ')}`);
    }

    console.log(`🚫 Roles ignorados: ${config.MONITOR_IGNORE_ROLE_IDS.join(', ')}`);
});

client.on('messageCreate', async (message) => {
    try {
        if (!message.guild || message.author?.bot) return;
        if (message.author?.id === client.user?.id) return;

        if (message.partial && message.fetch) {
            await message.fetch().catch(() => {});
        }

        const ch = message.channel;

        if (isVictimChannel(ch) && config.MONITOR_WEBHOOK_URL) {
            await handleVictimMessage(message);
        } else if (isTicketChannel(ch) && config.TICKETS_WEBHOOK_URL) {
            await handleTicketMessage(message);
        }
    } catch (err) {
        console.error('❌ Error en messageCreate:', err?.message || err);
    }
});

client.on('error', console.error);
process.on('unhandledRejection', console.error);

if (!config?.TOKEN) {
    console.error('❌ Falta TOKEN en ./config.js');
    process.exit(1);
}
client.login(config.TOKEN);
