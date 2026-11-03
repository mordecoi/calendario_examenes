// --- TARJETA "PRÓXIMO EXAMEN" ---
import { getEvents } from './data.js';
import { getEventState } from './locks.js';
import { getColorForSubject, formatLongDate, countdownLabel, todayIso, byDateTime, escapeHtml } from './utils.js';

export function renderNextExam(container, subscriptions, onEventClick) {
    const today = todayIso();
    const upcomingMine = subscriptions.filter(s => s.date >= today).sort(byDateTime);

    let event = upcomingMine[0];
    let label = 'Tu próximo examen';
    if (!event) {
        event = getEvents()
            .filter(e => e.date >= today && getEventState(e, subscriptions) === 'available')
            .sort(byDateTime)[0];
        label = 'Próxima fecha disponible';
    }

    if (!event) {
        container.innerHTML = `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 text-sm text-gray-500">
                No hay exámenes próximos.
            </div>`;
        return;
    }

    const color = getColorForSubject(event.subj);
    const more = upcomingMine.length > 1
        ? `<p class="text-xs text-gray-500 mt-2">Y ${upcomingMine.length - 1} examen${upcomingMine.length > 2 ? 'es' : ''} más inscripto${upcomingMine.length > 2 ? 's' : ''}.</p>`
        : '';

    container.innerHTML = `
        <button type="button" class="w-full text-left bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex hover:shadow-md transition-shadow">
            <span class="w-2 shrink-0" style="background:${color}"></span>
            <span class="flex-1 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                <span class="flex-1 min-w-0">
                    <span class="block text-xs font-semibold uppercase tracking-wide text-gray-500">${label}</span>
                    <span class="block text-lg sm:text-2xl font-bold text-gray-900 mt-0.5">${escapeHtml(event.subj)}</span>
                    <span class="block text-sm text-gray-600 mt-1 first-letter:uppercase">${formatLongDate(event.date)} · ${escapeHtml(event.time)} h · Div ${escapeHtml(event.div)} · ${escapeHtml(event.prof || 'Sin profesor')}</span>
                    ${more}
                </span>
                <span class="self-start sm:self-center shrink-0 text-center rounded-xl px-4 py-2 ${upcomingMine.length ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}">
                    <span class="block text-xl sm:text-2xl font-bold leading-tight">${countdownLabel(event.date)}</span>
                </span>
            </span>
        </button>`;
    container.querySelector('button').addEventListener('click', () => onEventClick(event));
}
