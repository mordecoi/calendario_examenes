// --- GESTIÓN DE LOCALSTORAGE ---

const STORAGE_KEY = 'calendar_subscriptions';

/**
 * Carga las inscripciones desde localStorage
 * @returns {Array} Array de eventos suscritos
 */
export function loadSubscriptions() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
}

/**
 * Guarda las inscripciones en localStorage
 * @param {Array} subscriptions - Array de eventos a guardar
 */
export function saveSubscriptions(subscriptions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
}
