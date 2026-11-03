// --- RESUMEN "MIS FECHAS" (columna derecha en PC) ---
import { eventKey, getColorForSubject, formatShortDate, todayIso, byDateTime, escapeHtml } from './utils.js';

/**
 * @param {HTMLElement} container
 * @param {Array} subscriptions
 * @param {string[]} subjects - todas las materias
 * @param {{broken: Set<string>, orphans: Set<string>, missingOn: boolean, onOpen: Function, onToggleMissing: Function}} opts
 */
export function renderMyDates(container, subscriptions, subjects, { broken, orphans, missingOn, onOpen, onToggleMissing }) {
    const chosen = new Set(subscriptions.map(s => s.subj));
    const missing = subjects.filter(s => !chosen.has(s));
    const pct = subjects.length ? Math.round((chosen.size / subjects.length) * 100) : 0;
    const today = todayIso();

    container.innerHTML = `
        <div class="px-4 pt-4 pb-3">
            <div class="flex items-baseline justify-between">
                <h2 class="text-lg font-bold">Mis fechas</h2>
                <span class="text-xs text-gray-500"><strong class="text-gray-900">${chosen.size}</strong> de ${subjects.length} materias</span>
            </div>
            <div class="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                <div class="h-full bg-emerald-500 rounded-full" style="width:${pct}%"></div>
            </div>
        </div>
        <ul class="my-dates-list px-2 pb-2 space-y-0.5"></ul>
        ${missing.length ? `
            <div class="px-4 pb-3">
                <button type="button" class="missing-btn w-full text-left text-xs rounded-lg px-3 py-2 border transition-colors ${
                    missingOn ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                }">
                    <strong>Faltan ${missing.length}:</strong> ${missing.map(escapeHtml).join(', ')}
                    <span class="block mt-1 font-semibold">${missingOn ? 'Mostrando solo estas · tocá para ver todas' : 'Ver solo sus fechas →'}</span>
                </button>
            </div>` : `
            <p class="px-4 pb-3 text-xs text-emerald-700 font-medium">✓ Elegiste fecha para todas las materias</p>`}
    `;

    const list = container.querySelector('.my-dates-list');
    if (!subscriptions.length) {
        list.innerHTML = '<li class="px-2 py-1 text-xs text-gray-400">Todavía no elegiste ninguna fecha.</li>';
    }
    [...subscriptions].sort(byDateTime).forEach(sub => {
        const key = eventKey(sub);
        const warn = orphans.has(key) ? ' <span title="Esta fecha ya no está en el calendario">⚠️</span>'
            : broken.has(key) ? ' <span title="Falta la correlativa en una fecha anterior">⚠️</span>' : '';
        const li = document.createElement('li');
        li.innerHTML = `
            <button type="button" class="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-gray-50 ${sub.date < today ? 'opacity-50' : ''}">
                <span class="w-2 h-2 rounded-full shrink-0" style="background:${getColorForSubject(sub.subj)}"></span>
                <span class="flex-1 min-w-0 truncate text-xs font-medium text-gray-900">${escapeHtml(sub.subj)}${warn}</span>
                <span class="shrink-0 text-xs text-gray-500 tabular-nums">${formatShortDate(sub.date)} · ${escapeHtml(sub.time)}</span>
            </button>`;
        li.querySelector('button').addEventListener('click', () => onOpen(sub));
        list.appendChild(li);
    });

    container.querySelector('.missing-btn')?.addEventListener('click', onToggleMissing);
}
