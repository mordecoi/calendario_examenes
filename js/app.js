import { loadSubscriptions, saveSubscriptions } from './storage.js';
import { renderCalendar, initCalendarControls } from './calendar.js';
import { showModal, closeModal, initModalListeners } from './modal.js';
import { renderSubscriptions } from './subscriptions.js';

// --- ESTADO DE LA APLICACIÓN ---
class CalendarApp {
    constructor() {
        // Estado inicial: Noviembre 2025 (mes 10)
        this.currentDate = new Date(2025, 10, 1);
        this.subscriptions = loadSubscriptions();
    }

    /**
     * Inicializa la aplicación
     */
    init() {
        // Inicializar listeners
        initModalListeners();
        initCalendarControls(this.currentDate, () => this.handleMonthChange());

        // Renderizar estado inicial
        this.render();
    }

    /**
     * Renderiza todo el estado de la aplicación
     */
    render() {
        renderCalendar(
            this.currentDate.getFullYear(),
            this.currentDate.getMonth(),
            this.subscriptions,
            (event) => this.handleEventClick(event)
        );
        renderSubscriptions(this.subscriptions, (subject) => this.handleRemoveSubscription(subject));
    }

    /**
     * Maneja el click en un evento del calendario
     */
    handleEventClick(event) {
        const isSubscribed = this.subscriptions.some(sub => sub.subj === event.subj);
        showModal(event, (e) => this.handleSubscription(e), isSubscribed);
    }

    /**
     * Maneja la inscripción a un evento
     */
    handleSubscription(event) {
        this.subscriptions.push(event);
        saveSubscriptions(this.subscriptions);
        this.render();
        closeModal();
    }

    /**
     * Maneja la eliminación de una inscripción
     */
    handleRemoveSubscription(subject) {
        this.subscriptions = this.subscriptions.filter(sub => sub.subj !== subject);
        saveSubscriptions(this.subscriptions);
        this.render();
    }

    /**
     * Maneja el cambio de mes
     */
    handleMonthChange() {
        this.render();
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const app = new CalendarApp();
    app.init();
});
