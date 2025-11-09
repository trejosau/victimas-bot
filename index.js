// index.js (ESM)
// Monitor de:
//  - VÍCTIMAS SafeCat en trades/crosstrade (solo usuarios sin roles jerarquía) -> MONITOR_WEBHOOK_URL
//  - VÍCTIMAS GLOBALES en muchos servers/canales -> GLOBAL_VICTIM_WEBHOOK_URL
//      * En SafeCat: solo Victima (sin jerarquía / hitter)
//      * En otros servers: TODO lo que llegue
//  - TICKETS 📩mm-* (Victima/MaximoRol/Hitter + transcripts HTML) [SOLO server principal]
//  - BORRADOS / MODIFICADOS / BANEADOS -> cada uno a su webhook [SOLO server principal]
// Solo escribe en webhooks, nunca en canales directamente.

import https from 'node:https';
import { Client } from 'discord.js-selfbot-v13';
import { CONFIG as config } from './config.js';

const client = new Client();

// ====== GUILD principal (Safe Cat) ======
const TARGET_GUILD_ID = config.GUILD_ID || '1376127147847979050';

// ====== ROLES JERARQUÍA (orden de mayor a menor) — SOLO se usan en TARGET_GUILD_ID ======
const ROLE_HIERARCHY = [
    { id: '1432128766347313192', key: 'owner', label: 'Owner' },
    { id: '1421330806399565888', key: 'comandante', label: 'Comandante' },
    { id: '1421330812892348478', key: 'co_owner', label: 'Co Owner' },
    { id: '1421330817829048422', key: 'supervisor', label: 'Supervisor' },
    { id: '1421330822211829760', key: 'management', label: 'Management' },
    { id: '1421330829098881085', key: 'lider_supremo', label: 'Lider Supremo' },
    { id: '1421330834358800404', key: 'lider_comunidad', label: 'Lider de la comunidad' },
    { id: '1421330837957513350', key: 'mod', label: 'Mod' },
    { id: '1421330843410104370', key: 'director_ejecutivo', label: 'Director Ejecutivo' },
    { id: '1421330848275501097', key: 'disenador', label: 'Diseñador' },
    { id: '1421330852041719970', key: 'com_manager', label: 'Com Manager' },
    { id: '1421330864003874876', key: 'head_staff', label: 'Head Staff' },
    { id: '1421330872459727002', key: 'staff', label: 'Staff' },
    { id: '1421330878755241994', key: 'mm_supremo', label: 'MM Supremo' },
    { id: '1421330882769195008', key: 'mm_exp', label: 'MM EXP' },
    { id: '1421330888192561152', key: 'mm_prueba', label: 'MM Prueba' },
    { id: '1421330898569269409', key: 'hitter', label: 'Hitter' },
];

const HITTER_ROLE_ID = '1421330898569269409';

const COLORS = {
    deleted: 0xff4c4c,
    edited: 0x4c9bff,
    banned: 0xff9f43,
};

// ====== VÍCTIMAS GLOBALES (servers/canales externos) ======
// Solo estos pares (guildId, channelId) se envían al GLOBAL_VICTIM_WEBHOOK_URL
const GLOBAL_VICTIM_CHANNELS = {
    // server: 1379903029460996137 canal: 1429669144009117818
    '1379903029460996137': ['1429669144009117818'],

    // server 1377051353490391162 canal 1383567918188728471
    '1377051353490391162': ['1383567918188728471'],

    // server 1325277506957213816 canales 1407968964923101244, 1416897400521359531
    '1325277506957213816': ['1407968964923101244', '1416897400521359531'],

    // server 1392228891535474760 canal 1392484472468799488
    '1392228891535474760': ['1392484472468799488'],

    // server 1386044817330671696 canal 1410740016325591100
    '1386044817330671696': ['1410740016325591100'],

    // server 1167866589144686603 canales 1428137518104318045, 1428137519588835388
    '1167866589144686603': ['1428137518104318045', '1428137519588835388'],

    // server 1396981360761241732 canal 1408948401470439527
    '1396981360761241732': ['1408948401470439527'],

    // server 1034844508539596820 canal 1395497866210050118
    '1034844508539596820': ['1395497866210050118'],

    // server 1217946897340436511 canal 1431138860108091432
    '1217946897340436511': ['1431138860108091432'],

    // server 1333115747920248873 canales 1434669835782197258,1390781336348000356,1390790178121187539
    '1333115747920248873': [
        '1434669835782197258',
        '1390781336348000356',
        '1390790178121187539',
    ],

    // server 1382792643154546718 canales 1384978914270642286, 1408674384377544804
    '1382792643154546718': ['1384978914270642286', '1408674384377544804'],

    // server 1387155968055316600 canales 1433085817827495969, 1433084423997362276, 1433084318393041007
    '1387155968055316600': [
        '1433085817827495969',
        '1433084423997362276',
        '1433084318393041007',
    ],

    // server 1433084318393041007 canales 1426448433815752845, 1426448908015501363
    '1433084318393041007': ['1426448433815752845', '1426448908015501363'],

    // server 1368183361637715968 canales 1371993335509815316, 1398417727068311552
    '1368183361637715968': ['1371993335509815316', '1398417727068311552'],
};

const GLOBAL_VICTIM_WEBHOOK_URL = config.GLOBAL_VICTIM_WEBHOOK_URL || '';

// ====== HTTP helpers ======
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

// Para transcripts (manda archivo HTML, devuelve attachmentUrl)
function postWebhookWithFile(webhookUrl, payload, fileName, fileContent) {
    return new Promise((resolve, reject) => {
        try {
            const url = new URL(webhookUrl);
            const boundary = '------------------------' + Math.random().toString(16).slice(2);
            const payloadJson = JSON.stringify(payload || {});

            let body = '';
            body += `--${boundary}\r\n`;
            body += `Content-Disposition: form-data; name="payload_json"\r\n`;
            body += `Content-Type: application/json\r\n\r\n`;
            body += payloadJson + '\r\n';

            body += `--${boundary}\r\n`;
            body += `Content-Disposition: form-data; name="files[0]"; filename="${fileName}"\r\n`;
            body += `Content-Type: text/html\r\n\r\n`;
            body += fileContent + '\r\n';

            body += `--${boundary}--\r\n`;

            const buffer = Buffer.from(body, 'utf8');

            const req = https.request(
                {
                    hostname: url.hostname,
                    path: url.pathname + url.search,
                    method: 'POST',
                    headers: {
                        'Content-Type': `multipart/form-data; boundary=${boundary}`,
                        'Content-Length': buffer.length,
                    },
                },
                (res) => {
                    let data = '';
                    res.on('data', (chunk) => (data += chunk));
                    res.on('end', () => {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            try {
                                const json = JSON.parse(data || '{}');
                                const attachmentUrl =
                                    json?.attachments && json.attachments[0]
                                        ? json.attachments[0].url
                                        : null;

                                resolve({
                                    status: res.statusCode,
                                    attachmentUrl,
                                    raw: json,
                                });
                            } catch (e) {
                                console.warn('[webhookFile] No se pudo parsear JSON de respuesta:', e);
                                resolve({
                                    status: res.statusCode,
                                    attachmentUrl: null,
                                    raw: data,
                                });
                            }
                        } else {
                            reject(new Error(`WebhookFile HTTP ${res.statusCode}: ${data}`));
                        }
                    });
                }
            );

            req.on('error', reject);
            req.write(buffer);
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
function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function formatDate(ts) {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
        d.getHours()
    )}:${pad(d.getMinutes())}`;
}
function initialsFromName(name = '') {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

// ====== Roles / tipo usuario — SOLO se usa en TARGET_GUILD_ID ======
async function getMemberRoleInfo(message) {
    if (!message.guild || message.guild.id !== TARGET_GUILD_ID) {
        return { member: null, highestRole: null, type: 'Desconocido', label: 'Usuario' };
    }

    let member = message.member;
    try {
        if (!member && message.guild) {
            member = await message.guild.members.fetch(message.author.id).catch(() => null);
        }
    } catch {
        member = null;
    }

    let highestRole = null;
    if (member?.roles?.cache) {
        for (const r of ROLE_HIERARCHY) {
            if (member.roles.cache.has(r.id)) {
                highestRole = r;
                break;
            }
        }
    }

    let type;
    let label;

    if (!highestRole) {
        type = 'Victima';
        label = 'Usuario';
    } else if (highestRole.id === HITTER_ROLE_ID) {
        type = 'Hitter';
        label = highestRole.label;
    } else {
        type = 'MaximoRol';
        label = highestRole.label;
    }

    return { member, highestRole, type, label };
}

// ====== Imagenes de embeds ======
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

function buildPrimaryEmbeds({
                                message,
                                titlePrefix,
                                msgUrl,
                                fileLinks,
                                embedColor,
                                footerPrefix,
                            }) {
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

// ====== Filtros de canal (SafeCat) ======
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

    return prefixes.some((p) => {
        // Si el prefijo termina en * (ej: "mm-*"), lo tomamos como comodín
        if (p.endsWith('*')) {
            const base = p.slice(0, -1); // "mm-* " -> "mm-"
            // aquí usas includes para "que contengan esto en el nombre"
            return name.includes(base);
        }

        // Prefijos normales siguen funcionando como antes
        return name.startsWith(p);
    });
}


// ====== Filtro: canal de víctimas globales (cualquier GUILD) ======
function isGlobalVictimChannel(guildId, channelId) {
    const list = GLOBAL_VICTIM_CHANNELS[String(guildId)];
    if (!list) return false;
    return list.includes(String(channelId));
}

// ====== TICKETS: store para transcripts y resumen ======
/*
 ticketStores: channelId -> {
   messages: Map<messageId, TranscriptMessage>,
   order: string[],
   participants: Set<userId>,
   meta: { ... },
   reported: boolean
 }
*/
const ticketStores = new Map();

function getTicketStore(channel) {
    let store = ticketStores.get(channel.id);
    if (!store) {
        store = {
            messages: new Map(),
            order: [],
            participants: new Set(),
            meta: {
                channelId: channel.id,
                channelName: channel.name,
                guildId: channel.guild?.id,
                guildName: channel.guild?.name,
                createdAt: null,
                closedAt: null,
                opId: null,
                opUsername: null,
                opDiscrim: null,
            },
            reported: false,
        };
        ticketStores.set(channel.id, store);
        console.log(`[tickets][TRANSCRIPT] Iniciado store para #${channel.name} (${channel.id})`);
    }
    return store;
}

function deriveTicketIdFromChannelName(name = '') {
    const m = name.match(/(\d+)/g);
    if (m && m.length) return m[m.length - 1];
    return name || 'ticket';
}

// ====== Transcripts: registro por mensaje ======
function recordTicketTranscriptMessage(message, roleInfo) {
    const ch = message.channel;
    const store = getTicketStore(ch);

    // meta básica
    if (!store.meta.channelName) store.meta.channelName = ch.name;
    if (!store.meta.guildId) store.meta.guildId = message.guild?.id;
    if (!store.meta.guildName) store.meta.guildName = message.guild?.name;
    const ts = message.createdTimestamp || Date.now();
    if (!store.meta.createdAt || ts < store.meta.createdAt) store.meta.createdAt = ts;

    // participantes (todos menos bots)
    if (!message.author.bot) {
        store.participants.add(message.author.id);
    }

    const messageId = message.id;
    let tm = store.messages.get(messageId);
    if (!tm) {
        tm = {
            messageId,
            authorId: message.author.id,
            authorTag: `${message.author.username || 'Usuario'}#${
                message.author.discriminator || '0000'
            }`,
            authorUsername: message.author.username || 'Usuario',
            authorDiscrim: message.author.discriminator || '0000',
            roleType: roleInfo.type,
            roleLabel: roleInfo.label,
            createdAt: ts,
            contentOriginal: message.content || '',
            contentCurrent: message.content || '',
            attachments: [],
            edits: [],
            deleted: false,
            deletedAt: null,
        };
        store.messages.set(messageId, tm);
        store.order.push(messageId);
    }

    // Adjuntos + imágenes de embeds
    const attachments = [];
    if (message.attachments?.size > 0) {
        for (const [, att] of message.attachments) {
            attachments.push({
                name: att.name || 'archivo',
                url: att.url,
                isImage: isImageAttachment(att),
            });
        }
    }
    if (Array.isArray(message.embeds) && message.embeds.length > 0) {
        for (const e of message.embeds) {
            const urls = extractImageUrlsFromEmbedObject(e);
            for (const u of urls) {
                attachments.push({
                    name: 'embed-image',
                    url: u,
                    isImage: true,
                });
            }
        }
    }
    tm.attachments.push(...attachments);

    return store;
}

// Edición transcript
async function recordTicketEdit(oldMessage, newMessage) {
    const ch = newMessage.channel;
    if (!isTicketChannel(ch)) return;
    const roleInfo = await getMemberRoleInfo(newMessage);
    const store = getTicketStore(ch);

    let tm = store.messages.get(newMessage.id);
    if (!tm) {
        const baseContent = oldMessage?.content ?? newMessage.content ?? '';
        tm = {
            messageId: newMessage.id,
            authorId: newMessage.author?.id || 'unknown',
            authorTag: `${newMessage.author?.username || 'Desconocido'}#${
                newMessage.author?.discriminator || '0000'
            }`,
            authorUsername: newMessage.author?.username || 'Desconocido',
            authorDiscrim: newMessage.author?.discriminator || '0000',
            roleType: roleInfo.type,
            roleLabel: roleInfo.label,
            createdAt: newMessage.createdTimestamp || Date.now(),
            contentOriginal: baseContent,
            contentCurrent: baseContent,
            attachments: [],
            edits: [],
            deleted: false,
            deletedAt: null,
        };
        store.messages.set(newMessage.id, tm);
        store.order.push(newMessage.id);
        console.log(
            `[tickets][EDIT] Mensaje no estaba en store, creado para ${tm.authorTag} en #${ch.name}`
        );
    }

    const oldContent = tm.contentCurrent || oldMessage?.content || '';
    const newContent = newMessage.content || '';

    if (oldContent === newContent) return;

    tm.edits.push({
        oldContent,
        newContent,
        editedAt: Date.now(),
    });
    tm.contentCurrent = newContent;

    console.log(
        `[tickets][EDIT] ${tm.authorTag} editó mensaje en #${ch.name} (old="${oldContent}", new="${newContent}")`
    );
}

// Borrado transcript
async function recordTicketDelete(message) {
    const ch = message.channel;
    if (!isTicketChannel(ch)) return;
    const roleInfo = await getMemberRoleInfo(message);
    const store = getTicketStore(ch);

    let tm = store.messages.get(message.id);
    if (!tm) {
        const baseContent = message.content ?? '';
        tm = {
            messageId: message.id,
            authorId: message.author?.id || 'unknown',
            authorTag: `${message.author?.username || 'Desconocido'}#${
                message.author?.discriminator || '0000'
            }`,
            authorUsername: message.author?.username || 'Desconocido',
            authorDiscrim: message.author?.discriminator || '0000',
            roleType: roleInfo.type,
            roleLabel: roleInfo.label,
            createdAt: message.createdTimestamp || Date.now(),
            contentOriginal: baseContent,
            contentCurrent: baseContent,
            attachments: [],
            edits: [],
            deleted: true,
            deletedAt: Date.now(),
        };
        store.messages.set(message.id, tm);
        store.order.push(message.id);
    } else {
        tm.deleted = true;
        tm.deletedAt = Date.now();
        if (!tm.contentCurrent) {
            tm.contentCurrent = message.content || '';
            if (!tm.contentOriginal) tm.contentOriginal = tm.contentCurrent;
        }
    }

    console.log(`[tickets][DELETE] Mensaje eliminado de ${tm.authorTag} en #${ch.name}`);
}

// ====== HTML Transcript ======
function buildTranscriptHtml(channel, store) {
    const ticketId = deriveTicketIdFromChannelName(store.meta.channelName || channel.name);
    const channelName = store.meta.channelName || channel.name || `ticket-${ticketId}`;
    const statusText = 'CERRADO';

    const createdAtText = store.meta.createdAt ? formatDate(store.meta.createdAt) : 'Desconocido';
    const closedAtText = store.meta.closedAt ? formatDate(store.meta.closedAt) : 'Desconocido';

    const opUsername = store.meta.opUsername || 'Desconocido';
    const opDiscrim = store.meta.opDiscrim || '0000';
    const opId = store.meta.opId || 'Desconocido';

    let messagesHtml = '';

    for (const msgId of store.order) {
        const tm = store.messages.get(msgId);
        if (!tm) continue;

        const avatarInitials = initialsFromName(tm.authorUsername);
        const baseNameEsc = escapeHtml(tm.authorUsername);
        const tagLabelEsc = escapeHtml(`${tm.authorUsername}#${tm.authorDiscrim}`);
        const roleLabelDisplay =
            tm.roleType === 'Victima'
                ? 'Usuario'
                : tm.roleType === 'Hitter'
                    ? 'Hitter'
                    : tm.roleLabel || 'Staff';

        const roleLabelEsc = escapeHtml(roleLabelDisplay);

        let avatarGradient;
        if (tm.roleType === 'Victima') {
            avatarGradient = 'from-emerald-500 to-emerald-700';
        } else if (tm.roleType === 'Hitter') {
            avatarGradient = 'from-rose-500 to-orange-500';
        } else {
            avatarGradient = 'from-indigo-500 to-purple-600';
        }

        const contentCurrentEsc = escapeHtml(tm.contentCurrent || '');
        const createdAtMsg = formatDate(tm.createdAt);
        const hasEdits = tm.edits && tm.edits.length > 0;
        const lastEdit = hasEdits ? tm.edits[tm.edits.length - 1] : null;
        const editedAtText = lastEdit ? `${formatDate(lastEdit.editedAt)} (editado)` : createdAtMsg;
        const deletedAtText = tm.deleted
            ? `${tm.deletedAt ? formatDate(tm.deletedAt) : createdAtMsg} (eliminado)`
            : '';

        // Adjuntos
        const imageParts = [];
        const fileParts = [];
        for (const att of tm.attachments || []) {
            const safeName = escapeHtml(att.name || 'archivo');
            const safeUrl = escapeHtml(att.url || '#');
            if (att.isImage) {
                imageParts.push(
                    `<img src="${safeUrl}" alt="${safeName}" class="mt-2 max-h-64 rounded border border-discordBorder" />`
                );
            } else {
                fileParts.push(
                    `<li><a href="${safeUrl}" class="text-discordBlue hover:underline" target="_blank" rel="noopener noreferrer">${safeName}</a></li>`
                );
            }
        }

        let attachmentsHtml = '';
        if (fileParts.length > 0) {
            attachmentsHtml += `
        <div class="mt-1 text-xs text-gray-300">
          <span class="font-semibold">Archivos:</span>
          <ul class="list-disc list-inside">
            ${fileParts.join('\n')}
          </ul>
        </div>`;
        }
        if (imageParts.length > 0) {
            attachmentsHtml += imageParts.join('\n');
        }

        if (tm.deleted) {
            // ELIMINADO (ROJO)
            messagesHtml += `
        <article class="flex gap-3 group">
          <div class="mt-0.5 h-10 w-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-sm font-semibold">
            ${escapeHtml(avatarInitials)}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2">
              <span class="font-semibold text-white">${baseNameEsc}</span>
              <span class="text-xs text-gray-400">@${tagLabelEsc}</span>

              <span class="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-700/70 text-gray-200 border border-gray-500/40">
                ${roleLabelEsc}
              </span>

              <span class="ml-auto text-[11px] text-gray-500 font-mono">
                ${deletedAtText}
              </span>
            </div>

            <div class="mt-0.5 text-sm text-red-300 line-through whitespace-pre-line break-words">
              ${contentCurrentEsc || '(mensaje vacío)'}
            </div>

            <div class="mt-1 inline-flex items-center gap-1 rounded border border-red-500/50 bg-red-500/10 px-2 py-1 text-[11px] text-red-200">
              <span>🗑️</span>
              <span>Mensaje eliminado</span>
            </div>

            ${attachmentsHtml}
          </div>
        </article>
      `;
        } else if (hasEdits) {
            // EDITADO (AZUL)
            const oldEsc = escapeHtml(lastEdit.oldContent || '');
            const newEsc = escapeHtml(lastEdit.newContent || '');
            messagesHtml += `
        <article class="flex gap-3 group">
          <div class="mt-0.5 h-10 w-10 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-sm font-semibold">
            ${escapeHtml(avatarInitials)}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2">
              <span class="font-semibold text-white">${baseNameEsc}</span>
              <span class="text-xs text-gray-400">@${tagLabelEsc}</span>

              <span class="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-700/70 text-gray-200 border border-gray-500/40">
                ${roleLabelEsc}
              </span>

              <span class="ml-auto text-[11px] text-gray-500 font-mono">
                ${editedAtText}
              </span>
            </div>

            <div class="mt-0.5 text-sm text-gray-100 whitespace-pre-line break-words">
              ${contentCurrentEsc || '(mensaje vacío)'}
            </div>

            <div class="mt-1 text-xs rounded-lg border border-blue-500/50 bg-blue-500/10 px-3 py-2 text-blue-100 space-y-1">
              <p class="text-[10px] uppercase tracking-wide font-semibold text-blue-300">
                Mensaje editado
              </p>
              <p class="text-[12px]">
                <span class="font-semibold text-blue-200">Editado:</span>
                <span class="line-through text-blue-200/80">
                  ${oldEsc || '(vacío)'}
                </span>
              </p>
              <p class="text-[12px]">
                <span class="font-semibold text-blue-200">Nuevo:</span>
                <span class="text-blue-50">
                  ${newEsc || '(vacío)'}
                </span>
              </p>
            </div>

            ${attachmentsHtml}
          </div>
        </article>
      `;
        } else {
            // NORMAL (GRIS)
            messagesHtml += `
        <article class="flex gap-3 group">
          <div class="mt-0.5 h-10 w-10 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-sm font-semibold">
            ${escapeHtml(avatarInitials)}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2">
              <span class="font-semibold text-white">${baseNameEsc}</span>
              <span class="text-xs text-gray-400">@${tagLabelEsc}</span>

              <span class="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-700/70 text-gray-200 border border-gray-500/40">
                ${roleLabelEsc}
              </span>

              <span class="ml-auto text-[11px] text-gray-500 font-mono">
                ${createdAtMsg}
              </span>
            </div>

            <div class="mt-0.5 text-sm text-gray-100 whitespace-pre-line break-words">
              ${contentCurrentEsc || '(mensaje vacío)'}
            </div>

            ${attachmentsHtml}
          </div>
        </article>
      `;
        }
    }

    const cierreHtml = `
    <div class="flex items-center gap-3 text-xs text-gray-400 pt-2">
      <div class="flex-1 border-t border-discordBorder/70"></div>
      <span class="px-2 py-0.5 rounded-full bg-discordDark/80 border border-discordBorder/70 flex items-center gap-1">
        <span class="text-green-400">✔</span>
        Ticket cerrado – ${escapeHtml(closedAtText)}
      </span>
      <div class="flex-1 border-t border-discordBorder/70"></div>
    </div>
  `;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Transcript Ticket #${escapeHtml(ticketId)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            discordBg: '#313338',
            discordDark: '#1E1F22',
            discordDarker: '#111214',
            discordBorder: '#202225',
            discordBlue: '#5865F2',
          },
        },
      },
    }
  </script>
</head>
<body class="bg-discordDarker text-gray-100 min-h-screen font-sans">
  <div class="max-w-5xl mx-auto px-4 py-8">
    <header class="mb-6">
      <h1 class="text-2xl font-semibold flex items-center gap-2">
        <span class="inline-flex h-8 w-8 items-center justify-center rounded bg-discordBlue/20 text-discordBlue">
          🎫
        </span>
        Transcript – Ticket #${escapeHtml(ticketId)}
      </h1>
      <p class="mt-1 text-sm text-gray-400">
        Canal: <span class="font-mono text-gray-200">#${escapeHtml(channelName)}</span> ·
        Estado: <span class="text-green-400 font-medium">${escapeHtml(statusText)}</span>
      </p>

      <div class="mt-3 grid gap-3 text-xs text-gray-300 sm:grid-cols-3">
        <div class="bg-discordDark/80 rounded-lg border border-discordBorder px-3 py-2">
          <p class="text-gray-400 text-[11px] uppercase tracking-wide">Creado</p>
          <p class="mt-0.5 font-mono">${escapeHtml(createdAtText)}</p>
        </div>
        <div class="bg-discordDark/80 rounded-lg border border-discordBorder px-3 py-2">
          <p class="text-gray-400 text-[11px] uppercase tracking-wide">Cerrado</p>
          <p class="mt-0.5 font-mono">${escapeHtml(closedAtText)}</p>
        </div>
        <div class="bg-discordDark/80 rounded-lg border border-discordBorder px-3 py-2">
          <p class="text-gray-400 text-[11px] uppercase tracking-wide">Autor del ticket</p>
          <p class="mt-0.5">
            <span class="font-semibold">${escapeHtml(opUsername)}</span>
            <span class="text-gray-400">#${escapeHtml(opDiscrim)}</span><br />
            <span class="font-mono text-[11px] text-gray-500">ID: ${escapeHtml(opId)}</span>
          </p>
        </div>
      </div>
    </header>

    <main class="bg-discordBg rounded-xl shadow-xl border border-discordBorder overflow-hidden">
      <div class="flex items-center gap-2 border-b border-discordBorder bg-discordDark px-4 py-3 text-sm text-gray-300">
        <span class="text-gray-500 text-lg">#</span>
        <span class="font-semibold">${escapeHtml(channelName)}</span>
        <span class="text-xs text-gray-500">· Transcript de ticket (solo lectura)</span>
      </div>

      <div class="p-4 space-y-4 text-sm">

        <div class="flex items-center gap-3 text-xs text-gray-400">
          <div class="flex-1 border-t border-discordBorder/70"></div>
          <span class="px-2 py-0.5 rounded-full bg-discordDark/80 border border-discordBorder/70">
            Ticket creado – ${escapeHtml(createdAtText)}
          </span>
          <div class="flex-1 border-t border-discordBorder/70"></div>
        </div>

        ${messagesHtml}

        ${cierreHtml}
      </div>
    </main>
  </div>
</body>
</html>`;

    return html;
}

// ====== Audit log helpers ======
async function findMessageDeleter(message) {
    try {
        if (!message.guild || !message.guild.fetchAuditLogs) return null;
        const logs = await message.guild.fetchAuditLogs({ type: 72, limit: 5 }); // MESSAGE_DELETE
        const now = Date.now();

        for (const entry of logs.entries.values()) {
            if (!entry.target || entry.target.id !== message.author?.id) continue;
            const diff = now - entry.createdTimestamp;
            if (diff >= 0 && diff < 15000) {
                return entry.executor || null;
            }
        }
        return null;
    } catch (err) {
        console.warn('[borrados] No se pudo leer audit logs:', err?.message || err);
        return null;
    }
}

async function findBanExecutorAndReason(guild, bannedUserId) {
    try {
        if (!guild || !guild.fetchAuditLogs) return { executor: null, reason: null };
        const logs = await guild.fetchAuditLogs({ type: 20, limit: 5 }); // MEMBER_BAN_ADD
        const now = Date.now();

        for (const entry of logs.entries.values()) {
            if (!entry.target || entry.target.id !== bannedUserId) continue;
            const diff = now - entry.createdTimestamp;
            if (diff >= 0 && diff < 30000) {
                return {
                    executor: entry.executor || null,
                    reason: entry.reason || null,
                };
            }
        }
        return { executor: null, reason: null };
    } catch (err) {
        console.warn('[baneados] No se pudo leer audit logs:', err?.message || err);
        return { executor: null, reason: null };
    }
}

// ====== Handlers especiales: borrados / modificados / baneados (SOLO SafeCat) ======
async function handleDeletedMessage(message) {
    if (!config.BORRADOS_WEBHOOK_URL) return;
    if (!message.guild || message.guild.id !== TARGET_GUILD_ID) return;

    const author = message.author;
    const authorTag = author
        ? `${author.username || 'Usuario'}#${author.discriminator || '0000'}`
        : 'Desconocido';
    const authorMention = author ? `<@${author.id}>` : 'Desconocido';

    const deleter = await findMessageDeleter(message);
    const deletedBy =
        deleter && deleter.id
            ? `<@${deleter.id}> (${deleter.username || deleter.tag || 'Moderador'})`
            : 'Desconocido';

    const { embeds: imgEmbeds, files: fileLinks } =
        collectEmbedsAndFilesFromMessage(message, COLORS.deleted);

    const baseDesc = [];
    if (message.content?.trim()) {
        baseDesc.push(message.content.trim());
    } else {
        baseDesc.push('(sin contenido de texto)');
    }

    if (fileLinks.length > 0) {
        baseDesc.push(
            `**Archivos:**\n${fileLinks.map((f) => `• [${f.name}](${f.url})`).join('\n')}`
        );
    }

    const description = baseDesc.join('\n\n');

    const primaryEmbed = {
        color: COLORS.deleted,
        title: 'Mensaje borrado',
        author: author
            ? {
                name: `${authorTag} (${author.id})`,
                icon_url: author.displayAvatarURL
                    ? author.displayAvatarURL({ format: 'png', size: 128 })
                    : undefined,
            }
            : undefined,
        description,
        fields: [
            {
                name: 'Autor',
                value: authorMention,
                inline: true,
            },
            {
                name: 'Canal',
                value: `#${message.channel?.name || 'desconocido'}`,
                inline: true,
            },
            {
                name: 'Borrado por',
                value: deletedBy,
                inline: false,
            },
        ],
        timestamp: new Date().toISOString(),
    };

    let embeds = [primaryEmbed, ...imgEmbeds];
    if (embeds.length > 10) {
        embeds = embeds.slice(0, 9);
        embeds.push({
            color: COLORS.deleted,
            description: 'Se alcanzó el límite de 10 embeds. (Contenido truncado)',
        });
    }

    const body = {
        content: `🗑️ Mensaje borrado en #${message.channel?.name || 'desconocido'}`,
        allowed_mentions: { users: [] },
        embeds,
    };

    await postWebhookJson(config.BORRADOS_WEBHOOK_URL, body);
    console.log(
        `[borrados] ${authorTag} mensaje borrado en #${message.channel?.name} (borrado por: ${deletedBy})`
    );
}

async function handleEditedMessage(oldMessage, newMessage) {
    if (!config.MODIFICADOS_WEBHOOK_URL) return;
    if (!newMessage.guild || newMessage.guild.id !== TARGET_GUILD_ID) return;

    const before =
        typeof oldMessage?.content === 'string' && oldMessage.content.length > 0
            ? oldMessage.content
            : '(desconocido; mensaje no estaba en caché)';
    const after =
        typeof newMessage.content === 'string' && newMessage.content.length > 0
            ? newMessage.content
            : '(sin contenido)';

    if (before === after) return;

    const author = newMessage.author;
    if (!author) return;

    const authorTag = `${author.username || 'Usuario'}#${author.discriminator || '0000'}`;
    const authorMention = `<@${author.id}>`;

    const embed = {
        color: COLORS.edited,
        title: 'Mensaje modificado',
        author: {
            name: `${authorTag} (${author.id})`,
            icon_url: author.displayAvatarURL
                ? author.displayAvatarURL({ format: 'png', size: 128 })
                : undefined,
        },
        fields: [
            {
                name: 'Autor',
                value: authorMention,
                inline: true,
            },
            {
                name: 'Canal',
                value: `#${newMessage.channel?.name || 'desconocido'}`,
                inline: true,
            },
            {
                name: 'Antes',
                value: before.slice(0, 1024) || '(vacío)',
                inline: false,
            },
            {
                name: 'Después',
                value: after.slice(0, 1024) || '(vacío)',
                inline: false,
            },
        ],
        timestamp: new Date().toISOString(),
    };

    const body = {
        content: `✏️ Mensaje modificado en #${newMessage.channel?.name || 'desconocido'}`,
        allowed_mentions: { users: [author.id] },
        embeds: [embed],
    };

    await postWebhookJson(config.MODIFICADOS_WEBHOOK_URL, body);
    console.log(
        `[modificados] ${authorTag} editó mensaje en #${newMessage.channel?.name}`
    );
}

// ====== Handlers VÍCTIMAS SafeCat + VÍCTIMAS GLOBALES + TICKETS ======

// VÍCTIMAS SafeCat trades / crosstrade → solo Victima (sin roles jerarquía)
async function handleSafeCatVictimMessage(message) {
    const roleInfo = await getMemberRoleInfo(message);
    console.log(
        `[victimas-SafeCat] ${message.author.tag} en #${message.channel.name} Tipo: ${roleInfo.type} (${roleInfo.label})`
    );

    if (roleInfo.type !== 'Victima') return;

    const pingUser = `<@${message.author.id}>`;
    const msgUrl = messageLink(message.guild.id, message.channel.id, message.id);

    const { embeds: msgImageEmbeds, files: msgFileLinks } =
        collectEmbedsAndFilesFromMessage(message, config.MONITOR_EMBED_COLOR);

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
    console.log(`📤 [víctimas-SafeCat] Reenviado: ${message.author.tag} → MONITOR_WEBHOOK_URL`);
}

// VÍCTIMAS GLOBALES (nuevo webhook)
// - SafeCat trades/crosstrade: sólo Victima (sin roles jerarquía / hitter)
// - Otros servers/canales configurados: TODO lo que llegue (sin roles)
async function handleGlobalVictimMessage(message) {
    if (!GLOBAL_VICTIM_WEBHOOK_URL) return;
    if (!message.guild) return;

    const guildId = message.guild.id;
    const channel = message.channel;
    const channelId = channel.id;

    let forward = false;

    if (guildId === TARGET_GUILD_ID && isVictimChannel(channel)) {
        // SafeCat trades/crosstrade -> sólo Victima
        const roleInfo = await getMemberRoleInfo(message);
        console.log(
            `[victimas-GLOBAL] (SafeCat) ${message.author.tag} en #${channel.name} Tipo: ${roleInfo.type} (${roleInfo.label})`
        );
        if (roleInfo.type === 'Victima') forward = true;
    } else if (isGlobalVictimChannel(guildId, channelId)) {
        // Otros servers/canales → TODO
        console.log(
            `[victimas-GLOBAL] ${message.author.tag} en #${channel.name} (guild ${guildId})`
        );
        forward = true;
    }

    if (!forward) return;

    const pingUser = `<@${message.author.id}>`;
    const msgUrl = messageLink(guildId, channelId, message.id);

    const { embeds: msgImageEmbeds, files: msgFileLinks } =
        collectEmbedsAndFilesFromMessage(message, config.MONITOR_EMBED_COLOR);

    const msgPrimary = buildPrimaryEmbeds({
        message,
        titlePrefix: '',
        msgUrl,
        fileLinks: msgFileLinks,
        embedColor: config.MONITOR_EMBED_COLOR,
        footerPrefix: 'Global Victimas · ',
    });

    let embeds = [...msgPrimary, ...msgImageEmbeds];
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

    await postWebhookJson(GLOBAL_VICTIM_WEBHOOK_URL, body);
    console.log(
        `📤 [victimas-GLOBAL] Reenviado: ${message.author.tag} (guild ${guildId}) → GLOBAL_VICTIM_WEBHOOK_URL`
    );
}

// TICKETS: resumen (Victima) + transcripts (SOLO SafeCat)
async function handleTicketFlow(message) {
    const ch = message.channel;
    const roleInfo = await getMemberRoleInfo(message);

    console.log(
        `[tickets][MSG] ${message.author.tag} envió mensaje en #${ch.name} Tipo: ${roleInfo.type} (${roleInfo.label})`
    );

    // Registrar todo para transcript
    const store = recordTicketTranscriptMessage(message, roleInfo);

    // OP del ticket = primer mensaje de VÍCTIMA
    if (roleInfo.type === 'Victima' && !store.meta.opId) {
        store.meta.opId = message.author.id;
        store.meta.opUsername = message.author.username || 'Usuario';
        store.meta.opDiscrim = message.author.discriminator || '0000';
        console.log(
            `[tickets][META] OP del ticket #${ch.name}: ${store.meta.opUsername}#${store.meta.opDiscrim} (${store.meta.opId})`
        );
    }

    // Resumen al webhook de tickets solo 1 vez por canal, al primer mensaje de víctima
    if (roleInfo.type === 'Victima' && !store.reported && config.TICKETS_WEBHOOK_URL) {
        store.reported = true;
        console.log(
            `[tickets][REPORT] Primer mensaje de Victima en #${ch.name}, enviando resumen al webhook de tickets...`
        );

        const victimId = message.author.id;
        const victimMention = `<@${victimId}>`;

        const participantsIds = Array.from(store.participants || []);
        const participantsMentions =
            participantsIds.length > 0
                ? participantsIds.map((id) => `<@${id}>`).join(' ')
                : '(sin participantes)';

        const headerContent = `Victima: ${victimMention} \`\`\`${victimId}\`\`\`\nUsuarios: ${participantsMentions}`;


        const msgUrl = messageLink(message.guild.id, ch.id, message.id);
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
        console.log(`📤 [tickets] Reportado ticket ${ch.name} → webhook de tickets`);
    }
}

// ====== Runtime & eventos ======
client.on('ready', () => {
    console.log(`✅ Conectado como ${client.user.tag}`);

    if (config.MONITOR_WEBHOOK_URL) {
        console.log('🔍 [víctimas SafeCat] Activo');
        console.log(`   GUILD_ID: ${TARGET_GUILD_ID}`);
        console.log(`   Categoría: ${config.MONITOR_CATEGORY_ID}`);
        console.log(`   Canales: ${config.MONITOR_CHANNEL_IDS.join(', ')}`);
    }

    if (GLOBAL_VICTIM_WEBHOOK_URL) {
        console.log('🌐 [víctimas GLOBAL] Activo');
        console.log('   Servers/canales configurados:');
        for (const [gid, chans] of Object.entries(GLOBAL_VICTIM_CHANNELS)) {
            console.log(`   - Guild ${gid}: ${chans.join(', ')}`);
        }
        console.log(
            `   Además: trades/crosstrade de SafeCat (solo Victima) también se envían aquí.`
        );
    }

    if (config.TICKETS_WEBHOOK_URL || config.TRANSCRIPTS_WEBHOOK_URL) {
        console.log('🔍 [tickets] Activo (SOLO SafeCat)');
        console.log(`   Categoría: ${config.TICKETS_CATEGORY_ID}`);
        console.log(`   Prefijos: ${config.TICKETS_CHANNEL_PREFIXES.join(', ')}`);
    }

    if (config.BORRADOS_WEBHOOK_URL) console.log('🗑️ [borrados] Webhook activo (SOLO SafeCat)');
    if (config.MODIFICADOS_WEBHOOK_URL)
        console.log('✏️ [modificados] Webhook activo (SOLO SafeCat)');
    if (config.BANEADOS_WEBHOOK_URL) console.log('⛔ [baneados] Webhook activo (SOLO SafeCat)');
});

client.on('messageCreate', async (message) => {
    try {
        if (!message.guild || message.author?.bot) return;
        if (message.author?.id === client.user?.id) return;

        if (message.partial && message.fetch) {
            await message.fetch().catch(() => {});
        }

        const guildId = message.guild.id;
        const ch = message.channel;

        // 1) VÍCTIMAS SafeCat (trades/crosstrade) -> MONITOR_WEBHOOK_URL
        if (
            guildId === TARGET_GUILD_ID &&
            isVictimChannel(ch) &&
            config.MONITOR_WEBHOOK_URL
        ) {
            await handleSafeCatVictimMessage(message);
        }

        // 2) VÍCTIMAS GLOBAL (SafeCat Victima + otros servers/canales) -> GLOBAL_VICTIM_WEBHOOK_URL
        if (GLOBAL_VICTIM_WEBHOOK_URL) {
            await handleGlobalVictimMessage(message);
        }

        // A partir de aquí, SOLO server principal para tickets / borrados / modificados
        if (guildId !== TARGET_GUILD_ID) return;

        // 3) TICKETS 📩mm-* (SOLO SafeCat)
        if (isTicketChannel(ch)) {
            await handleTicketFlow(message);
        }
    } catch (err) {
        console.error('❌ Error en messageCreate:', err?.message || err);
    }
});

// Edits (global) -> transcript (solo tickets SafeCat) + webhook de modificados (SafeCat)
client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
        if (!newMessage.guild) return;
        if (newMessage.author?.bot) return;
        if (newMessage.author?.id === client.user?.id) return;

        if (newMessage.partial && newMessage.fetch) {
            await newMessage.fetch().catch(() => {});
        }

        const ch = newMessage.channel;

        if (newMessage.guild.id === TARGET_GUILD_ID && isTicketChannel(ch)) {
            await recordTicketEdit(oldMessage, newMessage);
        }

        await handleEditedMessage(oldMessage, newMessage);
    } catch (err) {
        console.error('❌ Error en messageUpdate:', err?.message || err);
    }
});

// Deletes (global) -> transcript (solo tickets SafeCat) + webhook de borrados (SafeCat)
client.on('messageDelete', async (message) => {
    try {
        if (!message.guild) return;
        if (message.author?.bot) return;
        if (message.author?.id === client.user?.id) return;

        const ch = message.channel;

        if (message.guild.id === TARGET_GUILD_ID && isTicketChannel(ch)) {
            await recordTicketDelete(message);
        }

        await handleDeletedMessage(message);
    } catch (err) {
        console.error('❌ Error en messageDelete:', err?.message || err);
    }
});

// Cuando se elimina un canal de ticket -> transcript HTML + link (SOLO SafeCat)
client.on('channelDelete', async (channel) => {
    try {
        if (!channel.guild || channel.guild.id !== TARGET_GUILD_ID) return;
        if (!isTicketChannel(channel)) return;
        console.log(`[tickets][CHANNEL DELETE] Canal borrado #${channel.name} (${channel.id})`);

        const store = ticketStores.get(channel.id);
        if (!store) {
            console.log(
                '[tickets][TRANSCRIPT] No hay datos guardados para este canal, nada que transcribir.'
            );
            return;
        }

        store.meta.closedAt = Date.now();

        if (!config.TRANSCRIPTS_WEBHOOK_URL) {
            console.log(
                '[tickets][TRANSCRIPT] No hay TRANSCRIPTS_WEBHOOK_URL configurado, no se puede enviar HTML.'
            );
            return;
        }

        const html = buildTranscriptHtml(channel, store);
        const ticketId = deriveTicketIdFromChannelName(store.meta.channelName || channel.name);
        const fileName = `transcript-${ticketId}-${channel.id}.html`;

        const payload = {
            content: `Transcript del ticket #${ticketId} – Canal: #${
                store.meta.channelName || channel.name
            }`,
        };

        const resp = await postWebhookWithFile(
            config.TRANSCRIPTS_WEBHOOK_URL,
            payload,
            fileName,
            html
        );

        console.log('[tickets][TRANSCRIPT] Respuesta webhook file status:', resp.status);
        if (resp.attachmentUrl) {
            console.log('[tickets][TRANSCRIPT] URL del transcript:', resp.attachmentUrl);
            await postWebhookJson(config.TRANSCRIPTS_WEBHOOK_URL, {
                content: `🔗 Preview del transcript #${ticketId}: ${resp.attachmentUrl}`,
            });
        } else {
            console.warn(
                '[tickets][TRANSCRIPT] No se encontró attachmentUrl en la respuesta del webhook'
            );
        }

        console.log(`[tickets][TRANSCRIPT] Transcript enviado para #${channel.name}`);
        ticketStores.delete(channel.id);
    } catch (err) {
        console.error('❌ Error en channelDelete/transcript:', err?.message || err);
    }
});

// Baneados -> webhook de baneados (SOLO SafeCat)
client.on('guildBanAdd', async (ban) => {
    try {
        if (!config.BANEADOS_WEBHOOK_URL) return;
        const guild = ban.guild;

        if (!guild || guild.id !== TARGET_GUILD_ID) return;

        const user = ban.user;

        const { executor, reason } = await findBanExecutorAndReason(guild, user.id);

        const executorMention = executor ? `<@${executor.id}>` : 'Desconocido';
        const bannedMention = `<@${user.id}>`;

        const content = `Quien ${executorMention} A Quien ${bannedMention}`;

        const userTag =
            user.tag || `${user.username || 'Usuario'}#${user.discriminator || '0000'}`;

        const embed = {
            color: COLORS.banned,
            title: 'Usuario baneado',
            description: `${bannedMention} (${userTag})`,
            fields: [
                {
                    name: 'Ban por',
                    value: executorMention,
                    inline: true,
                },
                {
                    name: 'Razón',
                    value: reason || 'Sin razón especificada',
                    inline: false,
                },
            ],
            timestamp: new Date().toISOString(),
        };

        const body = {
            content,
            allowed_mentions: {
                users: [user.id].concat(executor && executor.id ? [executor.id] : []),
            },
            embeds: [embed],
        };

        await postWebhookJson(config.BANEADOS_WEBHOOK_URL, body);
        console.log(
            `[baneados] ${executorMention} baneó a ${userTag} (${user.id}) en ${guild.name}`
        );
    } catch (err) {
        console.error('❌ Error en guildBanAdd (baneados):', err?.message || err);
    }
});

client.on('error', console.error);
process.on('unhandledRejection', console.error);

if (!config?.TOKEN) {
    console.error('❌ Falta TOKEN en ./config.js o .env');
    process.exit(1);
}

client.login(config.TOKEN);
