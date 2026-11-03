// --- CORRELATIVAS ---
// Regla: una fecha de la materia B se desbloquea solo si estás inscripto
// a cada correlativa de B en un día ANTERIOR a esa fecha.
import { getCorrelatives } from './data.js';
import { eventKey } from './utils.js';

export function getPrereqs(subj) {
    return getCorrelatives()[subj] || [];
}

/**
 * @returns {{locked: boolean, missing: Array<{subj: string, subscribedDate: string|null}>}}
 */
export function getLockInfo(event, subscriptions) {
    const missing = [];
    for (const prereq of getPrereqs(event.subj)) {
        const sub = subscriptions.find(s => s.subj === prereq);
        if (!sub || !(sub.date < event.date)) {
            missing.push({ subj: prereq, subscribedDate: sub ? sub.date : null });
        }
    }
    return { locked: missing.length > 0, missing };
}

/**
 * Estado de una fecha para mostrarla:
 * - 'subscribed': es la fecha a la que estás inscripto
 * - 'other': ya elegiste otra fecha de esta materia
 * - 'locked': falta una correlativa en una fecha anterior
 * - 'available'
 */
export function getEventState(event, subscriptions) {
    const key = eventKey(event);
    if (subscriptions.some(s => eventKey(s) === key)) return 'subscribed';
    if (subscriptions.some(s => s.subj === event.subj)) return 'other';
    if (getLockInfo(event, subscriptions).locked) return 'locked';
    return 'available';
}

/** Inscripciones que quedaron sin su correlativa (p. ej. al cancelar la previa) */
export function findBrokenSubscriptions(subscriptions) {
    return new Set(
        subscriptions
            .filter(s => getLockInfo(s, subscriptions).locked)
            .map(eventKey)
    );
}
