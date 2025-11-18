import { loadData } from './data.js';
import { loadSubscriptions, saveSubscriptions } from './storage.js';
import { configureCloudInteractive, isCloudConfigured } from './cloud.js';
import { renderCalendar, initCalendarControls } from './calendar.js';
import { showModal, closeModal, initModalListeners } from './modal.js';
import { renderSubscriptions } from './subscriptions.js';

// --- ESTADO DE LA APLICACIÓN ---
class CalendarApp {
    constructor() {
        // Estado inicial: Noviembre 2025 (mes 10)
        this.currentDate = new Date(2025, 10, 1);
        // Se inicializa vacío; se cargará de forma asíncrona en init()
        this.subscriptions = [];
        this.dataLoaded = false;
    }

    /**
     * Inicializa la aplicación
     */
    async init() {
        // Mostrar indicador de carga
        this.showLoading(true);

        // Cargar datos desde JSON
        this.dataLoaded = await loadData();

        // Cargar inscripciones (cloud/local)
        try {
            this.subscriptions = await loadSubscriptions();
        } catch (e) {
            console.warn('Fallo al cargar inscripciones, usando vacío:', e);
            this.subscriptions = [];
        }

        // Ocultar indicador de carga
        this.showLoading(false);

        // Mostrar advertencia si hubo error en la carga (modo offline)
        if (!this.dataLoaded) {
            this.showOfflineWarning();
        }

        // Inicializar listeners
        initModalListeners();
        initCalendarControls(this.currentDate, () => this.handleMonthChange());

        // Botón de configuración de sincronización
        const syncBtn = document.getElementById('sync-settings-button');
        if (syncBtn) {
            syncBtn.addEventListener('click', async () => {
                const configured = configureCloudInteractive({});
                if (configured) {
                    // Reintentar cargar inscripciones desde la nube después de configurar
                    this.subscriptions = await loadSubscriptions();
                    this.render();
                    this.showToast(isCloudConfigured() ? 'Sincronización configurada' : 'Configuración de sincronización incompleta');
                }
            });
        }

        // Renderizar estado inicial
        this.render();
    }

    showToast(message, type = 'success') {
        const colors = type === 'success' ? 'bg-green-600' : type === 'warn' ? 'bg-yellow-600' : 'bg-red-600';
        const toast = document.createElement('div');
        toast.className = `${colors} text-white fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded shadow-lg text-sm z-50`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }

    /**
     * Muestra advertencia de modo offline
     */
    showOfflineWarning() {
        const warning = document.createElement('div');
        warning.className = 'fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 sm:p-4 rounded shadow-lg z-40 text-sm';
        warning.innerHTML = `
            <div class="flex items-start">
                <svg class="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <div class="flex-1">
                    <strong class="font-semibold block mb-1">Modo sin conexión</strong>
                    <p class="text-xs">Usando datos de respaldo. Algunos eventos pueden estar desactualizados.</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-yellow-700 hover:text-yellow-900">
                    <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                </button>
            </div>
        `;
        document.body.appendChild(warning);
        
        // Auto-cerrar después de 8 segundos
        setTimeout(() => {
            if (warning.parentElement) {
                warning.remove();
            }
        }, 8000);
    }

    /**
     * Muestra u oculta el indicador de carga
     */
    showLoading(show) {
        const loadingEl = document.getElementById('loading-indicator');
        if (loadingEl) {
            loadingEl.classList.toggle('hidden', !show);
        }
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
        // Guardar (local y/o nube)
        saveSubscriptions(this.subscriptions)
            .then((res) => {
                if (res?.cloud) this.showToast('Inscripción guardada en la nube');
            })
            .catch(() => {
                this.showToast('Guardado solo en este dispositivo', 'warn');
            });
        this.render();
        closeModal();
    }

    /**
     * Maneja la eliminación de una inscripción
     */
    handleRemoveSubscription(subject) {
        this.subscriptions = this.subscriptions.filter(sub => sub.subj !== subject);
        saveSubscriptions(this.subscriptions)
            .then((res) => {
                if (res?.cloud) this.showToast('Cambios sincronizados en la nube');
            })
            .catch(() => {
                this.showToast('Cambios guardados solo localmente', 'warn');
            });
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
document.addEventListener('DOMContentLoaded', async () => {
    const app = new CalendarApp();
    await app.init();
});
