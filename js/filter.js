// --- FILTROS ---
// Materias: selección múltiple (vacío = todas).
// "Sin elegir": solo materias a las que todavía no les elegiste fecha.
// Se recuerdan en este dispositivo.
import { getColorForSubject, escapeHtml } from './utils.js';

const FILTER_KEY = 'subject_filter';
const MISSING_KEY = 'missing_filter';

export function loadFilter(validSubjects) {
    let subjects = new Set();
    let missing = false;
    try {
        const saved = JSON.parse(localStorage.getItem(FILTER_KEY) || '[]');
        subjects = new Set(saved.filter(s => validSubjects.includes(s)));
        missing = localStorage.getItem(MISSING_KEY) === '1';
    } catch { /* sin storage */ }
    return { subjects, missing };
}

function saveFilter(state) {
    try {
        localStorage.setItem(FILTER_KEY, JSON.stringify([...state.subjects]));
        localStorage.setItem(MISSING_KEY, state.missing ? '1' : '0');
    } catch { /* sin storage */ }
}

/** Aplica los filtros a la lista de fechas */
export function applyFilter(events, state, subscriptions) {
    const chosen = new Set(subscriptions.map(s => s.subj));
    return events.filter(e =>
        (!state.subjects.size || state.subjects.has(e.subj)) &&
        (!state.missing || !chosen.has(e.subj))
    );
}

export function setMissingFilter(state, value) {
    state.missing = value;
    saveFilter(state);
}

/**
 * @param {HTMLElement} container
 * @param {string[]} subjects - ordenadas
 * @param {{subjects: Set<string>, missing: boolean}} state - se modifica en el lugar
 * @param {number} missingCount - materias sin fecha elegida
 * @param {Function} onChange
 */
export function renderFilter(container, subjects, state, missingCount, onChange) {
    const chip = (active, activeCls = 'bg-gray-900 text-white border-gray-900') =>
        `shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-colors ${
            active ? activeCls : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
        }`;
    const none = !state.subjects.size && !state.missing;

    container.innerHTML = `
        <button type="button" data-action="all" class="${chip(none)}">Todas</button>
        <button type="button" data-action="missing" aria-pressed="${state.missing}"
            class="${chip(state.missing, 'bg-amber-500 text-white border-amber-500')}">
            Sin elegir <span class="rounded-full px-1.5 ${state.missing ? 'bg-white/25' : 'bg-amber-100 text-amber-800'}">${missingCount}</span>
        </button>
        <span class="shrink-0 w-px bg-gray-300 my-1" aria-hidden="true"></span>
        ${subjects.map(s => `
            <button type="button" data-subj="${escapeHtml(s)}" class="${chip(state.subjects.has(s))}" aria-pressed="${state.subjects.has(s)}">
                <span class="w-2 h-2 rounded-full" style="background:${getColorForSubject(s)}"></span>${escapeHtml(s)}
            </button>`).join('')}
    `;

    container.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            const { action, subj } = btn.dataset;
            if (action === 'all') {
                state.subjects.clear();
                state.missing = false;
            } else if (action === 'missing') {
                state.missing = !state.missing;
            } else if (state.subjects.has(subj)) {
                state.subjects.delete(subj);
            } else {
                state.subjects.add(subj);
            }
            saveFilter(state);
            onChange();
        });
    });
}
