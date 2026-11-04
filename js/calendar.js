// --- VISTA DE MESES (2×2 en PC, apilados en el celular) ---
import { getEventState, isMine } from './locks.js';
import { getColorForSubject, formatMonth, todayIso, byDateTime } from './utils.js';

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

/**
 * @param {HTMLElement} container
 * @param {string[]} months - ["2026-11", ...]
 * @param {Array} events - fechas visibles (ya filtradas)
 * @param {Array} subscriptions
 * @param {{onDayClick: Function, renderMonthAgenda: Function}} handlers
 */
export function renderMonths(container, months, events, subscriptions, { onDayClick, renderMonthAgenda }) {
    container.innerHTML = '';
    const today = todayIso();

    months.forEach(ym => {
        const [year, month] = ym.split('-').map(Number);
        const monthEvents = events.filter(e => e.date.startsWith(ym)).sort(byDateTime);

        const section = document.createElement('section');
        section.id = `m-${ym}`;
        section.className = 'month-card bg-white rounded-2xl shadow-sm border border-gray-200 p-3 sm:p-4 scroll-mt-20';
        // En el celular, con un filtro activo, ocultar meses sin fechas
        if (!monthEvents.length) section.className += ' hidden lg:block';

        const mineCount = monthEvents.filter(e => isMine(getEventState(e, subscriptions))).length;
        section.innerHTML = `
            <div class="flex items-baseline justify-between mb-3 px-1">
                <h2 class="text-lg sm:text-xl font-bold text-gray-900">${formatMonth(ym)}</h2>
                <span class="text-xs text-gray-500">${monthEvents.length} fechas${mineCount ? ` · <span class="text-emerald-700 font-semibold">${mineCount} tuya${mineCount > 1 ? 's' : ''}</span>` : ''}</span>
            </div>
            <div class="grid grid-cols-7 gap-1 mb-1">
                ${WEEKDAYS.map(d => `<div class="text-center text-[11px] font-semibold text-gray-400 uppercase">${d}</div>`).join('')}
            </div>
        `;

        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-7 gap-1';

        const firstDay = new Date(year, month - 1, 1).getDay();
        const startingDay = firstDay === 0 ? 6 : firstDay - 1; // semana desde el lunes
        const daysInMonth = new Date(year, month, 0).getDate();

        for (let i = 0; i < startingDay; i++) {
            grid.appendChild(document.createElement('div'));
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const iso = `${ym}-${String(day).padStart(2, '0')}`;
            const dayEvents = monthEvents.filter(e => e.date === iso);
            grid.appendChild(buildDayCell(iso, day, dayEvents, subscriptions, today, onDayClick));
        }

        section.appendChild(grid);

        // Agenda del mes (solo en el celular)
        const agenda = document.createElement('div');
        agenda.className = 'month-agenda lg:hidden mt-4 border-t border-gray-100 pt-3';
        section.appendChild(agenda);
        renderMonthAgenda(agenda, monthEvents);

        container.appendChild(section);
    });
}

function buildDayCell(iso, day, dayEvents, subscriptions, today, onDayClick) {
    const isPast = iso < today;
    const isToday = iso === today;
    const states = dayEvents.map(e => getEventState(e, subscriptions));
    const mine = dayEvents.filter((e, i) => isMine(states[i]));
    const onlyFailed = mine.length > 0 && mine.every((e, i) => states[dayEvents.indexOf(e)] === 'failed');

    const cell = document.createElement(dayEvents.length ? 'button' : 'div');
    cell.dataset.date = iso;
    let cls = 'day-cell relative h-11 sm:h-14 lg:h-16 rounded-lg flex flex-col items-center justify-start pt-1 text-sm transition-colors';
    if (dayEvents.length) {
        cls += ' bg-gray-50 hover:bg-blue-50 active:bg-blue-100 cursor-pointer';
    }
    if (onlyFailed) {
        cls += ' ring-2 ring-red-400 bg-red-50';
    } else if (mine.length) {
        cls += ' ring-2 ring-emerald-500 bg-emerald-50';
    }
    if (isToday) {
        cls += ' outline outline-2 outline-blue-500';
    }
    if (isPast) cls += ' opacity-40';
    cell.className = cls;

    const num = document.createElement('span');
    num.className = `leading-none ${isToday ? 'font-bold text-blue-600' : dayEvents.length ? 'font-semibold text-gray-900' : 'text-gray-400'}`;
    num.textContent = day;
    cell.appendChild(num);

    if (dayEvents.length) {
        const dots = document.createElement('div');
        dots.className = 'flex flex-wrap justify-center gap-0.5 sm:gap-1 mt-1 px-0.5';
        dayEvents.forEach((e, i) => {
            const dot = document.createElement('span');
            const state = states[i];
            dot.className = 'block rounded-full w-1.5 h-1.5 sm:w-2 sm:h-2';
            if (state === 'locked') {
                dot.style.background = '#d1d5db';
            } else if (state === 'other') {
                dot.style.border = `1.5px solid ${getColorForSubject(e.subj)}`;
            } else {
                dot.style.background = getColorForSubject(e.subj);
            }
            if (state === 'subscribed' || state === 'passed') dot.className += ' ring-2 ring-offset-1 ring-emerald-500';
            if (state === 'failed') {
                dot.style.opacity = '0.4';
                dot.className += ' ring-2 ring-offset-1 ring-red-400';
            }
            dots.appendChild(dot);
        });
        cell.appendChild(dots);

        if (mine.length) {
            const check = document.createElement('span');
            const passedHere = dayEvents.some((e, i) => states[i] === 'passed');
            check.className = `absolute top-0.5 right-1 text-[10px] font-bold ${onlyFailed ? 'text-red-500' : 'text-emerald-600'}`;
            check.textContent = onlyFailed ? '✗' : passedHere ? '★' : '✓';
            cell.appendChild(check);
        }

        cell.title = dayEvents
            .map((e, i) => `${e.time} · Div ${e.div} · ${e.subj}${{ subscribed: ' ✓', passed: ' ✅', failed: ' ❌', locked: ' 🔒' }[states[i]] || ''}`)
            .join('\n');
        cell.setAttribute('aria-label', `${iso}: ${dayEvents.length} exámenes`);
        cell.addEventListener('click', () => onDayClick(iso));
    }
    return cell;
}

/** Resalta brevemente un elemento */
export function flash(el) {
    if (!el) return;
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1400);
}
