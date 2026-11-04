// --- LISTA "MIS INSCRIPCIONES" ---
import { getLockInfo } from './locks.js';
import { eventKey, getColorForSubject, formatLongDate, countdownLabel, todayIso, byDateTime, escapeHtml } from './utils.js';

/**
 * @param {HTMLElement} container
 * @param {Array} subscriptions
 * @param {Set<string>} broken - claves de inscripciones sin su correlativa
 * @param {{onOpen: Function, onRemove: Function, onResult: Function, orphans: Set<string>}} handlers
 */
export function renderSubscriptions(container, subscriptions, broken, { onOpen, onRemove, onResult, orphans = new Set() }) {
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
        item.className = 'flex items-start gap-3 p-3 sm:p-4 border-b border-gray-100 last:border-b-0';
        item.dataset.key = eventKey(sub);

        let warning = '';
        if (orphans.has(eventKey(sub))) {
            warning = '<span class="block text-xs text-amber-700 mt-1">⚠️ Esta fecha ya no figura en el calendario (¿la cambiaron?). Elegí otra o cancelala.</span>';
        } else if (isBroken) {
            const { missing } = getLockInfo(sub, subscriptions);
            warning = `<span class="block text-xs text-amber-700 mt-1">⚠️ Camino cortado: necesitás ${missing.map(m => escapeHtml(m.subj) + (m.failed ? ' (no aprobada)' : '')).join(', ')} en una fecha anterior</span>`;
        } else if (sub.result === 'failed') {
            warning = '<span class="block text-xs text-red-700 mt-1">Elegí otra fecha para volver a rendir.</span>';
        }

        const status = sub.result === 'passed'
            ? '<span class="shrink-0 text-[11px] font-semibold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">✅ Aprobada</span>'
            : sub.result === 'failed'
                ? '<span class="shrink-0 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">❌ No aprobada</span>'
                : `<span class="shrink-0 text-xs text-gray-500">${isPast ? '¿Cómo te fue?' : countdownLabel(sub.date)}</span>`;

        const resultBtn = (value, label, on) => `
            <button type="button" data-result="${value}" aria-pressed="${sub.result === value}"
                class="result-btn text-xs font-medium rounded-full border px-2.5 py-1 transition-colors active:scale-95 ${
                    sub.result === value ? on : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }">${label}</button>`;

        item.innerHTML = `
            <span class="self-stretch w-1.5 rounded-full shrink-0" style="background:${getColorForSubject(sub.subj)};${sub.result === 'failed' ? 'opacity:.35' : ''}"></span>
            <div class="flex-1 min-w-0">
                <button type="button" class="open-sub block w-full text-left">
                    <span class="flex items-center gap-2 flex-wrap">
                        <span class="font-semibold text-gray-900 text-sm sm:text-base ${sub.result === 'failed' ? 'line-through decoration-red-400' : ''}">${escapeHtml(sub.subj)}</span>
                        ${status}
                    </span>
                    <span class="block text-xs sm:text-sm text-gray-600 mt-0.5 first-letter:uppercase">${formatLongDate(sub.date)} · ${escapeHtml(sub.time)} h · Div ${escapeHtml(sub.div)} · ${escapeHtml(sub.prof || '—')}</span>
                    ${warning}
                </button>
                <div class="flex gap-2 mt-2">
                    ${resultBtn('passed', '✅ Aprobé', 'bg-emerald-600 text-white border-emerald-600')}
                    ${resultBtn('failed', '❌ No aprobé', 'bg-red-600 text-white border-red-600')}
                </div>
            </div>
            <button type="button" class="remove-sub shrink-0 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 active:scale-95 transition-all">
                ${sub.result ? 'Quitar' : 'Cancelar'}
            </button>`;

        item.querySelector('.open-sub').addEventListener('click', () => onOpen(sub));
        item.querySelectorAll('.result-btn').forEach(b => b.addEventListener('click', () =>
            onResult(sub, sub.result === b.dataset.result ? null : b.dataset.result)));
        item.querySelector('.remove-sub').addEventListener('click', () => {
            if (confirm(`¿Quitar ${sub.subj} de tus fechas?`)) onRemove(sub);
        });
        container.appendChild(item);
    });
}
