// config.js (ESM) — configuración general
import 'dotenv/config';

/** CSV -> array de strings */
function csv(name) {
    const raw = process.env[name];
    if (!raw) return [];
    return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
}

export const CONFIG = {
    // ====== Auth (selfbot) ======
    TOKEN: process.env.TOKEN || '',

    // ====== GUILD principal (Safe Cat) ======
    GUILD_ID: process.env.GUILD_ID || '',

    // ====== VÍCTIMAS SafeCat (trades/crosstrade) ======
    MONITOR_CATEGORY_ID: process.env.MONITOR_CATEGORY_ID || '',
    MONITOR_CHANNEL_IDS: csv('MONITOR_CHANNEL_IDS'),
    MONITOR_WEBHOOK_URL: process.env.MONITOR_WEBHOOK_URL || '',

    // ====== TICKETS (📩mm-*) ======
    TICKETS_CATEGORY_ID: process.env.TICKETS_CATEGORY_ID || '',
    TICKETS_CHANNEL_PREFIXES: csv('TICKETS_CHANNEL_PREFIXES'),
    TICKETS_WEBHOOK_URL: process.env.TICKETS_WEBHOOK_URL || '',

    // ====== TRANSCRIPTS HTML ======
    TRANSCRIPTS_WEBHOOK_URL: process.env.TRANSCRIPTS_WEBHOOK_URL || '',

    // ====== BORRADOS / MODIFICADOS / BANEADOS (SOLO GUILD principal) ======
    BORRADOS_WEBHOOK_URL: process.env.BORRADOS_WEBHOOK_URL || '',
    MODIFICADOS_WEBHOOK_URL: process.env.MODIFICADOS_WEBHOOK_URL || '',
    BANEADOS_WEBHOOK_URL: process.env.BANEADOS_WEBHOOK_URL || '',

    // ====== VÍCTIMAS GLOBALES (multi-server) ======
    GLOBAL_VICTIM_WEBHOOK_URL: process.env.GLOBAL_VICTIM_WEBHOOK_URL || '',

    // ====== Roles jerarquía (opcional, para logs) ======
    MONITOR_IGNORE_ROLE_IDS: csv('MONITOR_IGNORE_ROLE_IDS'),

    // ====== Estilo embeds ======
    MONITOR_EMBED_COLOR: Number(process.env.MONITOR_EMBED_COLOR || 0xFFD000),
};
