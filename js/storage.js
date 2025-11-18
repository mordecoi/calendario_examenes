// --- GESTIÓN DE LOCALSTORAGE + CLOUD SYNC ---

import { isCloudConfigured, fetchCloudSubscriptions, saveCloudSubscriptions } from './cloud.js';

const STORAGE_KEY = 'calendar_subscriptions';

/**
 * Carga las inscripciones desde localStorage
 * @returns {Array} Array de eventos suscritos
 */
export function loadLocalSubscriptions() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
}

/**
 * Guarda las inscripciones en localStorage
 * @param {Array} subscriptions - Array de eventos a guardar
 */
export function saveLocalSubscriptions(subscriptions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
}

/**
 * Carga inscripciones prefiriendo cloud cuando esté configurado
 * Fallback a local si hay error o no está configurado
 */
export async function loadSubscriptions() {
    if (isCloudConfigured()) {
        try {
            const cloud = await fetchCloudSubscriptions();
            // Guardar copia local para modo offline
            saveLocalSubscriptions(cloud.subscriptions || []);
            return cloud.subscriptions || [];
        } catch (e) {
            console.warn('No se pudo cargar desde la nube, usando local:', e.message || e);
            return loadLocalSubscriptions();
        }
    }
    return loadLocalSubscriptions();
}

/**
 * Guarda inscripciones localmente y en cloud si está configurado
 */
export async function saveSubscriptions(subscriptions) {
    // Guardar siempre local
    saveLocalSubscriptions(subscriptions);
    // Intentar guardar en la nube si está configurado
    if (isCloudConfigured()) {
        try {
            await saveCloudSubscriptions(subscriptions);
            return { cloud: true };
        } catch (e) {
            console.warn('Fallo al guardar en la nube. Queda guardado localmente.', e);
            return { cloud: false, error: e };
        }
    }
    return { cloud: false };
}
