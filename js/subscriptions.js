// --- LISTA "MIS INSCRIPCIONES" ---
import { getLockInfo } from './locks.js';
import { eventKey, getColorForSubject, formatLongDate, countdownLabel, todayIso, byDateTime, escapeHtml } from './utils.js';

/**
 * @param {HTMLElement} container
 * @param {Array} subscriptions
 * @param {Set<string>} broken - claves de inscripciones sin su correlativa
 * @param {{onOpen: Function, onRemove: Function, orphans: Set<string>}} handlers
 */
export function renderSubscriptions(container, subscriptions, broken, { onOpen, onRemove, orphans = new Set() }) {
    const badge = document.getElementById('subscriptions-badge');
    badge.textContent = subscriptions.length;
    badge.classList.toggle('hidden', subscriptions.length === 0);

    container.innerHTML = '';
    if (!subscriptions.length) {
        container.innerHTML = `
            <div class="p-6 text-center text-gray-500 text-sm">
                Todavía no elegiste ninguna fecha. Tocá un día del calendario para inscribirte.
            </div>`;
        return;
    }

    const today = todayIso();
    [...subscriptions].sort(byDateTime).forEach(sub => {
        const isBroken = broken.has(eventKey(sub));
        const isPast = sub.date < today;
        const item = document.createElement('div');
        item.className = `flex items-center gap-3 p-3 sm:p-4 border-b border-gray-100 last:border-b-0 ${isPast ? 'opacity-50' : ''}`;

        let warning = '';
        if (orphans.has(eventKey(sub))) {
            warning = '<span class="block text-xs text-amber-700 mt-1">⚠️ Esta fecha ya no figura en el calendario (¿la cambiaron?). Elegí otra o cancelala.</span>';
        } else if (isBroken) {
            const { missing } = getLockInfo(sub, subscriptions);
            warning = `<span class="block text-xs text-amber-700 mt-1">⚠️ Necesitás ${missing.map(m => escapeHtml(m.subj)).join(', ')} en una fecha anterior</span>`;
        }

        item.innerHTML = `
            <span class="self-stretch w-1.5 rounded-full shrink-0" style="background:${getColorForSubject(sub.subj)}"></span>
            <button type="button" class="open-sub flex-1 min-w-0 text-left">
                <span class="block font-semibold text-gray-900 text-sm sm:text-base">${escapeHtml(sub.subj)}</span>
                <span class="block text-xs sm:text-sm text-gray-600 mt-0.5 first-letter:uppercase">${formatLongDate(sub.date)} · ${escapeHtml(sub.time)} h · Div ${escapeHtml(sub.div)} · ${escapeHtml(sub.prof || '—')}</span>
                ${warning}
            </button>
            <span class="hidden sm:block text-xs text-gray-500 shrink-0">${isPast ? '' : countdownLabel(sub.date)}</span>
            <button type="button" class="remove-sub shrink-0 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 active:scale-95 transition-all">
                Cancelar
            </button>`;

        item.querySelector('.open-sub').addEventListener('click', () => onOpen(sub));
        item.querySelector('.remove-sub').addEventListener('click', () => {
            if (confirm(`¿Cancelar inscripción a ${sub.subj}?`)) onRemove(sub);
        });
        container.appendChild(item);
    });
}
