// config.js (ESM) — monitor víctimas + tickets
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

    // ====== BLOQUE 1: VÍCTIMAS (trades / crosstrade) ======
    MONITOR_CATEGORY_ID: process.env.MONITOR_CATEGORY_ID || '',
    MONITOR_CHANNEL_IDS: csv('MONITOR_CHANNEL_IDS'),          // ids de canales
    MONITOR_WEBHOOK_URL: process.env.MONITOR_WEBHOOK_URL || '',

    // ====== BLOQUE 2: TICKETS (📩mm-*) ======
    // Categoría de los tickets
    TICKETS_CATEGORY_ID: process.env.TICKETS_CATEGORY_ID || '',
    // Prefijos válidos: ej "📩mm-", "mm-"
    TICKETS_CHANNEL_PREFIXES: csv('TICKETS_CHANNEL_PREFIXES'),

    // Webhook de tickets
    TICKETS_WEBHOOK_URL: process.env.TICKETS_WEBHOOK_URL || '',

    // ====== Roles a ignorar (para ambos bloques) ======
    // Si el autor tiene alguno, se ignora su mensaje como víctima
    MONITOR_IGNORE_ROLE_IDS: csv('MONITOR_IGNORE_ROLE_IDS'),

    // ====== Estilo ======
    MONITOR_EMBED_COLOR: Number(process.env.MONITOR_EMBED_COLOR || 0xFFD000),
};
