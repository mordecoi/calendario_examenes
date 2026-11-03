// --- INSCRIPCIONES: localStorage + nube ---
import { fetchCloudSubscriptions, saveCloudSubscriptions, hasWriteAccess } from './cloud.js';

const STORAGE_KEY = 'calendar_subscriptions';
const PENDING_KEY = 'calendar_subscriptions_pending';
const SAVE_DELAY_MS = 1500;

let saveTimer = null;
let statusListener = () => {};

function safeGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch { /* sin storage */ }
}
function safeRemove(key) {
    try { localStorage.removeItem(key); } catch { /* sin storage */ }
}

export function loadLocalSubscriptions() {
    try {
        const saved = JSON.parse(safeGet(STORAGE_KEY) || '[]');
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function saveLocalSubscriptions(subscriptions) {
    safeSet(STORAGE_KEY, JSON.stringify(subscriptions));
}

function isPending() {
    return safeGet(PENDING_KEY) === '1';
}

/**
 * Estados: 'saved' | 'saving' | 'error' | 'readonly' | 'offline'
 */
export function onSyncStatus(listener) {
    statusListener = listener;
}

function setStatus(status, detail = '') {
    statusListener(status, detail);
}

/**
 * Carga las inscripciones. La nube manda, salvo que este dispositivo
 * tenga cambios sin subir (en ese caso se suben).
 * @param {Function} normalize - ajusta las inscripciones a las fechas actuales
 *   (nunca borra una elección del período vigente; ver App.reconcile)
 * @returns {Promise<Array>}
 */
export async function loadSubscriptions(normalize = subs => subs) {
    const local = normalize(loadLocalSubscriptions());
    let cloud;
    try {
        cloud = await fetchCloudSubscriptions();
    } catch (e) {
        console.warn('No se pudo leer la nube, uso copia local:', e.message);
        setStatus('offline', e.message);
        return local;
    }

    if (hasWriteAccess() && (isPending() || (cloud.missing && local.length > 0))) {
        saveLocalSubscriptions(local);
        scheduleSave(local, 0);
        return local;
    }

    const subs = normalize(cloud.subscriptions);
    saveLocalSubscriptions(subs);
    if (hasWriteAccess() && JSON.stringify(subs) !== JSON.stringify(cloud.subscriptions)) {
        // Se ajustó alguna inscripción (p. ej. cambió el horario): guardar la versión corregida
        scheduleSave(subs, SAVE_DELAY_MS);
        return subs;
    }
    setStatus(hasWriteAccess() ? 'saved' : 'readonly');
    return subs;
}

/** Guarda local al instante y sube a la nube un momento después */
export function saveSubscriptions(subscriptions) {
    saveLocalSubscriptions(subscriptions);
    if (!hasWriteAccess()) {
        setStatus('readonly');
        return;
    }
    scheduleSave(subscriptions, SAVE_DELAY_MS);
}

function scheduleSave(subscriptions, delay) {
    safeSet(PENDING_KEY, '1');
    setStatus('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, delay);
}

export async function flush() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!isPending() || !hasWriteAccess()) return;
    try {
        await saveCloudSubscriptions(loadLocalSubscriptions());
        safeRemove(PENDING_KEY);
        setStatus('saved');
    } catch (e) {
        console.error('Error al sincronizar:', e);
        setStatus('error', e.message);
    }
}

export function hasPendingChanges() {
    return isPending();
}

// Reintentar al volver la conexión y subir antes de salir de la app
window.addEventListener('online', () => { if (isPending()) flush(); });
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && saveTimer) flush();
});
