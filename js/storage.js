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
            console.log('📥 Inscripciones cargadas desde la nube');
            return cloud.subscriptions || [];
        } catch (e) {
            console.warn('No se pudo cargar desde la nube, usando local:', e.message || e);
            return loadLocalSubscriptions();
        }
    }
    return loadLocalSubscriptions();
}

/**
 * Guarda inscripciones SOLO localmente (no en cloud)
 * Para sincronizar con la nube, usar manualSyncToCloud()
 */
export function saveSubscriptions(subscriptions) {
    saveLocalSubscriptions(subscriptions);
}

/**
 * Sincronización manual a la nube (batch)
 * Sube las inscripciones locales actuales a GitHub
 */
export async function manualSyncToCloud() {
    if (!isCloudConfigured()) {
        throw new Error('Cloud no configurado. Usa "Configurar Token" primero.');
    }
    
    const localSubs = loadLocalSubscriptions();
    
    try {
        await saveCloudSubscriptions(localSubs);
        console.log('☁️ Sincronización manual exitosa');
        return { success: true, count: localSubs.length };
    } catch (e) {
        console.error('❌ Error en sincronización manual:', e);
        throw e;
    }
}
