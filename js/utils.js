import { getColors, getEvents } from './data.js';

export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** Identificador único de una fecha de examen */
export function eventKey(e) {
    return `${e.date}|${e.time}|${e.div}|${e.subj}`;
}

/** Ordena por fecha y hora */
export function byDateTime(a, b) {
    return (a.date + a.time).localeCompare(b.date + b.time);
}

/** "YYYY-MM-DD" -> Date local (sin problemas de zona horaria) */
export function parseIso(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
}

export function toIso(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function todayIso() {
    return toIso(new Date());
}

/** "martes 24 de noviembre" */
export function formatLongDate(iso) {
    const d = parseIso(iso);
    return `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

/** "mar 24 nov" */
export function formatShortDate(iso) {
    const d = parseIso(iso);
    return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "Noviembre 2026" a partir de "2026-11" */
export function formatMonth(ym) {
    const [y, m] = ym.split('-').map(Number);
    const name = MONTHS[m - 1];
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}

/** Días enteros desde hoy hasta la fecha */
export function daysUntil(iso) {
    const ms = parseIso(iso) - parseIso(todayIso());
    return Math.round(ms / 86400000);
}

export function countdownLabel(iso) {
    const n = daysUntil(iso);
    if (n === 0) return 'Hoy';
    if (n === 1) return 'Mañana';
    if (n < 0) return `Hace ${-n} días`;
    return `En ${n} días`;
}

export function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Color fijo por materia: se asigna en orden alfabético para que
 * dos materias distintas nunca compartan color (mientras alcance la paleta).
 */
let colorMap = null;
export function getColorForSubject(subject) {
    if (!colorMap) {
        const colors = getColors();
        const subjects = [...new Set(getEvents().map(e => e.subj))].sort();
        colorMap = new Map(subjects.map((s, i) => [s, colors[i % colors.length]]));
    }
    return colorMap.get(subject) || '#6b7280';
}
