import { getColorForSubject } from './utils.js';

// Elementos del DOM
const subscriptionsListContainer = document.getElementById('subscriptions-list-container');
const emptyListMessage = document.getElementById('empty-list-message');
const subscriptionsBadge = document.getElementById('subscriptions-badge');

/**
 * Renderiza la lista de inscripciones
 * @param {Array} subscriptions - Array de eventos suscritos
 * @param {Function} onRemove - Callback cuando se elimina una inscripción
 */
export function renderSubscriptions(subscriptions, onRemove) {
    // Limpiar la lista
    subscriptionsListContainer.innerHTML = '';

    // Actualizar badge
    if (subscriptions.length > 0) {
        subscriptionsBadge.textContent = subscriptions.length;
        subscriptionsBadge.classList.remove('hidden');
    } else {
        subscriptionsBadge.classList.add('hidden');
    }

    if (subscriptions.length === 0) {
        // Mostrar mensaje de lista vacía
        subscriptionsListContainer.appendChild(emptyListMessage);
        emptyListMessage.classList.remove('hidden');
    } else {
        emptyListMessage.classList.add('hidden');

        // Ordenar suscripciones por fecha
        subscriptions.sort((a, b) => new Date(a.date) - new Date(b.date));

        subscriptions.forEach(sub => {
            const itemEl = document.createElement('div');
            itemEl.className = 'flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors';
            
            const subDate = new Date(sub.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
            const colorClass = getColorForSubject(sub.subj);

            itemEl.innerHTML = `
                <div class="flex items-start space-x-2 sm:space-x-3 mb-2 sm:mb-0 flex-1 min-w-0">
                    <div class="${colorClass} w-1 h-full rounded-full flex-shrink-0"></div>
                    <div class="min-w-0 flex-1">
                        <p class="font-bold text-gray-800 text-sm sm:text-base truncate">${sub.subj}</p>
                        <p class="text-xs sm:text-sm text-gray-600 mt-1">
                            📅 ${subDate} - ${sub.time}h
                        </p>
                        <p class="text-xs sm:text-sm text-gray-600">
                            📍 Div. ${sub.div} · ${sub.prof || 'N/A'}
                        </p>
                    </div>
                </div>
                <button class="remove-sub-button w-full sm:w-auto mt-2 sm:mt-0 px-4 py-2 text-xs sm:text-sm text-white bg-red-500 rounded-lg font-medium hover:bg-red-600 active:bg-red-700 active:scale-95 transition-all shadow-sm flex-shrink-0">
                    Cancelar
                </button>
            `;
            
            // Añadir listener al botón "Cancelar"
            itemEl.querySelector('.remove-sub-button').addEventListener('click', () => {
                if (confirm(`¿Cancelar inscripción a ${sub.subj}?`)) {
                    onRemove(sub.subj);
                }
            });
            
            subscriptionsListContainer.appendChild(itemEl);
        });
    }
}
