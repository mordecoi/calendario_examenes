// --- FILTRO POR MATERIA ---
// Selección múltiple; vacío = todas. Se recuerda en este dispositivo.
import { getColorForSubject, escapeHtml } from './utils.js';

const FILTER_KEY = 'subject_filter';

export function loadFilter(validSubjects) {
    try {
        const saved = JSON.parse(localStorage.getItem(FILTER_KEY) || '[]');
        return new Set(saved.filter(s => validSubjects.includes(s)));
    } catch {
        return new Set();
    }
}

function saveFilter(selected) {
    try { localStorage.setItem(FILTER_KEY, JSON.stringify([...selected])); } catch { /* sin storage */ }
}

/**
 * @param {HTMLElement} container
 * @param {string[]} subjects - ordenadas
 * @param {Set<string>} selected - se modifica en el lugar
 * @param {Function} onChange
 */
export function renderFilter(container, subjects, selected, onChange) {
    const chip = (active) =>
        `shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-colors ${
            active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
        }`;

    container.innerHTML = `
        <button type="button" data-subj="" class="${chip(selected.size === 0)}">Todas</button>
        ${subjects.map(s => `
            <button type="button" data-subj="${escapeHtml(s)}" class="${chip(selected.has(s))}" aria-pressed="${selected.has(s)}">
                <span class="w-2 h-2 rounded-full" style="background:${getColorForSubject(s)}"></span>${escapeHtml(s)}
            </button>`).join('')}
    `;

    container.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            const subj = btn.dataset.subj;
            if (!subj) selected.clear();
            else if (selected.has(subj)) selected.delete(subj);
            else selected.add(subj);
            saveFilter(selected);
            onChange();
        });
    });
}
