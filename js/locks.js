// --- CORRELATIVAS Y RESULTADOS ---
// Regla: una fecha de la materia B se desbloquea solo si tenés cada correlativa de B
// en un día ANTERIOR y esa correlativa no está marcada como "No aprobé".
// Si marcás una correlativa como no aprobada, se cortan las materias que dependen de ella.
import { getCorrelatives } from './data.js';
import { eventKey } from './utils.js';

/** Una inscripción sigue "en juego" salvo que la hayas marcado como no aprobada */
export const isActive = sub => sub.result !== 'failed';

/** Estados que significan "esta fecha es tuya" */
export const isMine = state => state === 'subscribed' || state === 'passed' || state === 'failed';

export function getPrereqs(subj) {
    return getCorrelatives()[subj] || [];
}

/** Materias que dependen (directamente) de subj */
export function getDependents(subj) {
    return Object.entries(getCorrelatives())
        .filter(([, prereqs]) => prereqs.includes(subj))
        .map(([dependent]) => dependent);
}

/**
 * @returns {{locked: boolean, missing: Array<{subj: string, subscribedDate: string|null, failed: boolean}>}}
 */
export function getLockInfo(event, subscriptions) {
    const missing = [];
    for (const prereq of getPrereqs(event.subj)) {
        const attempts = subscriptions.filter(s => s.subj === prereq);
        const ok = attempts.some(s => isActive(s) && s.date < event.date);
        if (!ok) {
            const active = attempts.find(isActive);
            missing.push({
                subj: prereq,
                subscribedDate: active ? active.date : null,
                failed: !active && attempts.some(s => s.result === 'failed')
            });
        }
    }
    return { locked: missing.length > 0, missing };
}

/**
 * Estado de una fecha para mostrarla:
 * - 'passed' / 'failed': es tuya y ya marcaste el resultado
 * - 'subscribed': es tuya, sin resultado
 * - 'other': ya tenés otra fecha (vigente) de esta materia
 * - 'locked': falta una correlativa en una fecha anterior
 * - 'available'
 */
export function getEventState(event, subscriptions) {
    const key = eventKey(event);
    const mine = subscriptions.find(s => eventKey(s) === key);
    if (mine) {
        if (mine.result === 'passed') return 'passed';
        if (mine.result === 'failed') return 'failed';
        return 'subscribed';
    }
    if (subscriptions.some(s => s.subj === event.subj && isActive(s))) return 'other';
    if (getLockInfo(event, subscriptions).locked) return 'locked';
    return 'available';
}

/** Inscripciones pendientes que quedaron sin su correlativa (cancelada, movida o no aprobada) */
export function findBrokenSubscriptions(subscriptions) {
    return new Set(
        subscriptions
            .filter(s => !s.result && getLockInfo(s, subscriptions).locked)
            .map(eventKey)
    );
}
