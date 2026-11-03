// --- MODAL DE DETALLE ---
import { getLocations } from './data.js';
import { getLockInfo } from './locks.js';
import { formatLongDate, formatShortDate, getColorForSubject, escapeHtml } from './utils.js';

const modal = document.getElementById('event-modal');
const closeModalButton = document.getElementById('close-modal');

/**
 * @param {Object} event
 * @param {Array} subscriptions
 * @param {{onSubscribe: Function, onRemove: Function, onReplace: Function}} actions
 */
export function showModal(event, subscriptions, { onSubscribe, onRemove, onReplace }) {
    const loc = getLocations()[event.loc] || { address: 'No disponible', phone: 'No disponible' };

    document.getElementById('modal-header').style.background = getColorForSubject(event.subj);
    document.getElementById('modal-title').textContent = event.subj;
    document.getElementById('modal-datetime').textContent = `${formatLongDate(event.date)} a las ${event.time} h`;
    document.getElementById('modal-div').textContent = `División ${event.div}`;
    document.getElementById('modal-prof').textContent = event.prof || 'Profesor no especificado';
    document.getElementById('modal-location').textContent = event.loc;
    document.getElementById('modal-address').textContent = loc.address;
    document.getElementById('modal-phone').textContent = loc.phone;

    const isThis = s => s.date === event.date && s.time === event.time && s.div === event.div && s.subj === event.subj;
    const mine = subscriptions.find(isThis);
    const sameSubject = subscriptions.find(s => s.subj === event.subj && !isThis(s));
    const lock = getLockInfo(event, subscriptions);

    // Aviso (correlativas / otra fecha elegida)
    const note = document.getElementById('modal-note');
    note.className = 'hidden';
    note.innerHTML = '';
    if (lock.locked && !mine) {
        note.className = 'rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900';
        note.innerHTML = `<strong class="block mb-1">🔒 Bloqueada por correlativas</strong>
            Primero inscribite, en una fecha <em>anterior</em>, a:
            <ul class="list-disc ml-5 mt-1">${lock.missing.map(m =>
                `<li>${escapeHtml(m.subj)}${m.subscribedDate ? ` <span class="text-amber-700">(elegiste ${formatShortDate(m.subscribedDate)}, que no es anterior)</span>` : ''}</li>`
            ).join('')}</ul>`;
    } else if (lock.locked && mine) {
        note.className = 'rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900';
        note.innerHTML = `⚠️ Te falta la correlativa ${lock.missing.map(m => escapeHtml(m.subj)).join(', ')} en una fecha anterior.`;
    } else if (sameSubject) {
        note.className = 'rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900';
        note.textContent = `Ya estás inscripto a esta materia el ${formatShortDate(sameSubject.date)} (${sameSubject.time} h).`;
    }

    // Botón principal
    const oldButton = document.getElementById('subscribe-button');
    const button = oldButton.cloneNode(false);
    oldButton.replaceWith(button);
    button.disabled = false;
    const base = 'w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-lg font-semibold text-base sm:text-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100';

    if (mine) {
        button.textContent = 'Cancelar inscripción';
        button.className = `${base} bg-red-50 text-red-700 border border-red-200 hover:bg-red-100`;
        button.addEventListener('click', () => onRemove(mine), { once: true });
    } else if (lock.locked) {
        button.textContent = 'Bloqueada 🔒';
        button.className = `${base} bg-gray-200 text-gray-500`;
        button.disabled = true;
    } else if (sameSubject) {
        button.textContent = 'Cambiar a esta fecha';
        button.className = `${base} bg-blue-600 text-white hover:bg-blue-700`;
        button.addEventListener('click', () => onReplace(sameSubject, event), { once: true });
    } else {
        button.textContent = 'Inscribirme';
        button.className = `${base} bg-blue-600 text-white hover:bg-blue-700`;
        button.addEventListener('click', () => onSubscribe(event), { once: true });
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

export function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

export function initModalListeners() {
    closeModalButton.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
    });
}
