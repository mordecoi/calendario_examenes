import { eventsData } from './data.js';
import { getColorForSubject } from './utils.js';

// Elementos del DOM
const calendarBody = document.getElementById('calendar-body');
const monthYearDisplay = document.getElementById('month-year-display');

/**
 * Renderiza el calendario para un mes y año específicos
 * @param {number} year - Año a renderizar
 * @param {number} month - Mes a renderizar (0-11)
 * @param {Array} subscriptions - Lista de inscripciones actuales
 * @param {Function} onEventClick - Callback cuando se hace click en un evento
 */
export function renderCalendar(year, month, subscriptions, onEventClick) {
    // Limpiar calendario anterior
    calendarBody.innerHTML = '';
    
    // Configurar el título del mes y año
    const monthName = new Date(year, month).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    monthYearDisplay.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    // Días en el mes y día de inicio (0=Domingo, 1=Lunes...)
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Ajustar el primer día para que la semana comience en Lunes (0=Lunes, 6=Domingo)
    const startingDay = (firstDay === 0) ? 6 : firstDay - 1;

    // 1. Celdas vacías antes del primer día
    for (let i = 0; i < startingDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'p-1 sm:p-2 h-20 sm:h-28 md:h-36 bg-gray-50 opacity-50';
        calendarBody.appendChild(emptyCell);
    }

    // 2. Celdas de los días del mes
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day-cell p-1 sm:p-2 h-20 sm:h-28 md:h-36 bg-white relative hover:bg-gray-50 transition-colors';
        
        // Formato de fecha ISO (ej: 2025-11-25)
        const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Número del día
        const dayNumber = document.createElement('span');
        dayNumber.className = 'day-number text-[10px] sm:text-sm font-semibold text-gray-700 block';
        dayNumber.textContent = day;
        dayCell.appendChild(dayNumber);

        // Contenedor de eventos para scroll
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'absolute top-6 sm:top-8 left-0.5 sm:left-1 right-0.5 sm:right-1 bottom-0.5 sm:bottom-1 overflow-y-auto space-y-0.5 sm:space-y-1';
        dayCell.appendChild(eventsContainer);

        // Buscar eventos para este día (FILTRAR LOS QUE YA ESTÁN INSCRITOS)
        const subscribedSubjects = subscriptions.map(sub => sub.subj);
        const eventsForDay = eventsData.filter(e => 
            e.date === isoDate && !subscribedSubjects.includes(e.subj)
        );

        // Renderizar eventos
        eventsForDay.forEach(event => {
            const eventEl = document.createElement('div');
            const colorClass = getColorForSubject(event.subj);
            eventEl.className = `event-card ${colorClass} text-white text-[9px] sm:text-[10px] md:text-xs p-0.5 sm:p-1 rounded cursor-pointer hover:opacity-80 active:opacity-70 transition-opacity`;
            eventEl.textContent = `${event.time} - ${event.div}`;
            eventEl.title = `${event.subj}`;

            // Touch events para mejor respuesta táctil
            let touchStartY = 0;
            eventEl.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
            });
            
            eventEl.addEventListener('touchend', (e) => {
                const touchEndY = e.changedTouches[0].clientY;
                // Solo abrir si no fue scroll
                if (Math.abs(touchEndY - touchStartY) < 10) {
                    e.preventDefault();
                    onEventClick(event);
                }
            });

            eventEl.addEventListener('click', (e) => {
                e.stopPropagation();
                onEventClick(event);
            });
            
            eventsContainer.appendChild(eventEl);
        });

        calendarBody.appendChild(dayCell);
    }

    // 3. Celdas vacías después del último día
    const totalCells = startingDay + daysInMonth;
    const remainingCells = (totalCells % 7 === 0) ? 0 : 7 - (totalCells % 7);
    
    for (let i = 0; i < remainingCells; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'p-1 sm:p-2 h-20 sm:h-28 md:h-36 bg-gray-50 opacity-50';
        calendarBody.appendChild(emptyCell);
    }
}

/**
 * Inicializa los controles de navegación del calendario
 * @param {Object} currentDate - Objeto Date con la fecha actual
 * @param {Function} onMonthChange - Callback cuando cambia el mes
 */
export function initCalendarControls(currentDate, onMonthChange) {
    const prevButton = document.getElementById('prev-month');
    const nextButton = document.getElementById('next-month');

    prevButton.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        onMonthChange(currentDate);
    });

    nextButton.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        onMonthChange(currentDate);
    });
}
