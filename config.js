// config.js (ESM) — SOLO monitor
import 'dotenv/config';

/** CSV -> array de strings */
function csv(name) {
    const raw = process.env[name];
    if (!raw) return [];
    return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
}

export const CONFIG = {
    // ====== Autenticación (self) ======
    TOKEN: process.env.TOKEN || '',

    // ====== Ámbito ======
    MONITOR_CATEGORY_ID: process.env.MONITOR_CATEGORY_ID || '',
    MONITOR_CHANNEL_IDS: csv('MONITOR_CHANNEL_IDS'),

    // ====== Ignorar si el autor tiene alguno de estos roles ======
    MONITOR_IGNORE_ROLE_IDS: csv('MONITOR_IGNORE_ROLE_IDS'),

    // ====== Webhook destino ======
    MONITOR_WEBHOOK_URL: process.env.MONITOR_WEBHOOK_URL || '',

    // ====== Estilo ======
    MONITOR_EMBED_COLOR: Number(process.env.MONITOR_EMBED_COLOR || ''),
};
