// --- AGENDA (lista de fechas) ---
import { getLockInfo, getEventState } from './locks.js';
import { getColorForSubject, formatShortDate, formatMonth, todayIso, byDateTime, escapeHtml, countdownLabel } from './utils.js';

const STATE_BADGE = {
    subscribed: '<span class="shrink-0 text-[11px] font-semibold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">✓ Inscripto</span>',
    other: '<span class="shrink-0 text-[11px] text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">Otra fecha</span>',
    locked: '<span class="shrink-0 text-[11px] text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">🔒</span>',
    available: ''
};

/**
 * @param {HTMLElement} container
 * @param {Array} events - fechas a listar
 * @param {Array} subscriptions
 * @param {{idPrefix: string, groupByMonth?: boolean, onEventClick: Function}} opts
 */
export function renderAgenda(container, events, subscriptions, { idPrefix, groupByMonth = false, onEventClick }) {
    container.innerHTML = '';
    const today = todayIso();
    const sorted = [...events].sort(byDateTime);

    let currentMonth = null;
    let currentDay = null;
    let dayList = null;

    sorted.forEach(event => {
        const ym = event.date.slice(0, 7);
        if (groupByMonth && ym !== currentMonth) {
            currentMonth = ym;
            const h = document.createElement('h3');
            h.className = 'sticky top-0 z-10 bg-white/95 backdrop-blur px-4 py-2 text-sm font-bold text-gray-900 border-b border-gray-100';
            h.textContent = formatMonth(ym);
            container.appendChild(h);
        }

        if (event.date !== currentDay) {
            currentDay = event.date;
            const block = document.createElement('div');
            block.id = `${idPrefix}-${event.date}`;
            block.dataset.date = event.date;
            block.className = `agenda-day scroll-mt-24 rounded-lg ${groupByMonth ? 'px-3 py-2' : 'py-1.5'} ${event.date < today ? 'opacity-50' : ''}`;

            const isToday = event.date === today;
            const soon = event.date >= today ? `<span class="text-[11px] text-gray-400 font-normal">${countdownLabel(event.date)}</span>` : '';
            block.innerHTML = `
                <div class="flex items-baseline justify-between px-1 mb-1">
                    <span class="text-xs font-semibold uppercase tracking-wide ${isToday ? 'text-blue-600' : 'text-gray-500'}">${formatShortDate(event.date)}</span>
                    ${soon}
                </div>`;
            dayList = document.createElement('div');
            dayList.className = 'space-y-1';
            block.appendChild(dayList);
            container.appendChild(block);
        }

        dayList.appendChild(buildRow(event, subscriptions, onEventClick));
    });

    if (!sorted.length) {
        container.innerHTML = '<p class="text-sm text-gray-400 p-4">Sin fechas.</p>';
    }
}

function buildRow(event, subscriptions, onEventClick) {
    const state = getEventState(event, subscriptions);
    const color = getColorForSubject(event.subj);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `w-full text-left flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-gray-50 active:bg-gray-100 ${state === 'subscribed' ? 'bg-emerald-50 hover:bg-emerald-100' : ''} ${state === 'locked' || state === 'other' ? 'opacity-60' : ''}`;

    let detail = `Div ${escapeHtml(event.div)} · ${escapeHtml(event.prof || 'Sin profesor')}`;
    if (state === 'locked') {
        const { missing } = getLockInfo(event, subscriptions);
        detail = `Requiere ${missing.map(m => escapeHtml(m.subj)).join(', ')} antes`;
    }

    row.innerHTML = `
        <span class="self-stretch w-1 rounded-full shrink-0" style="background:${state === 'locked' ? '#d1d5db' : color}"></span>
        <span class="flex-1 min-w-0">
            <span class="block text-sm font-semibold text-gray-900 truncate">${escapeHtml(event.subj)}</span>
            <span class="block text-xs text-gray-500 truncate">${detail}</span>
        </span>
        ${state === 'locked' ? '' : `<span class="text-xs font-semibold text-gray-700 tabular-nums shrink-0">${escapeHtml(event.time)}</span>`}
        ${STATE_BADGE[state]}
    `;
    row.addEventListener('click', () => onEventClick(event));
    return row;
}
