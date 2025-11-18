import { getLocations } from './data.js';

// Elementos del DOM del modal
const modal = document.getElementById('event-modal');
const closeModalButton = document.getElementById('close-modal');

/**
 * Muestra el modal con los detalles del evento
 * @param {Object} event - Evento a mostrar
 * @param {Function} onSubscribe - Callback cuando se hace click en inscribir
 * @param {boolean} isSubscribed - Si ya está inscrito a esta materia
 */
export function showModal(event, onSubscribe, isSubscribed) {
    const locationDetails = getLocations();
    const loc = locationDetails[event.loc] || { address: 'No disponible', phone: 'No disponible' };
    
    document.getElementById('modal-title').textContent = `Div. ${event.div} - ${event.time}`;
    document.getElementById('modal-datetime').textContent = `${new Date(event.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${event.time}h`;
    document.getElementById('modal-subject').textContent = event.subj;
    document.getElementById('modal-prof').textContent = event.prof || 'Profesor no especificado';
    document.getElementById('modal-location').textContent = event.loc;
    document.getElementById('modal-address').textContent = loc.address;
    document.getElementById('modal-phone').textContent = loc.phone;

    // --- Lógica de Inscripción ---
    const subscribeButton = document.getElementById('subscribe-button');
    
    // Reemplazar el botón con un clon para limpiar event listeners anteriores
    let newButton = subscribeButton.cloneNode(true);
    subscribeButton.parentNode.replaceChild(newButton, subscribeButton);

    if (isSubscribed) {
        newButton.textContent = 'Ya estás inscripto';
        newButton.disabled = true;
    } else {
        newButton.textContent = 'Inscribirme';
        newButton.disabled = false;
        newButton.addEventListener('click', () => {
            onSubscribe(event);
        }, { once: true });
    }
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

/**
 * Cierra el modal
 */
export function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

/**
 * Inicializa los event listeners del modal
 */
export function initModalListeners() {
    closeModalButton.addEventListener('click', closeModal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Prevenir cierre accidental con swipe en móvil
    let modalStartY = 0;
    modal.addEventListener('touchstart', (e) => {
        modalStartY = e.touches[0].clientY;
    });
    
    modal.addEventListener('touchend', (e) => {
        const modalEndY = e.changedTouches[0].clientY;
        if (e.target === modal && modalEndY - modalStartY > 100) {
            closeModal();
        }
    });
}
