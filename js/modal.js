// --- MODAL DE DETALLE ---
import { getLocations } from './data.js';
import { getLockInfo, getDependents, isActive } from './locks.js';
import { formatLongDate, formatShortDate, getColorForSubject, escapeHtml } from './utils.js';

const modal = document.getElementById('event-modal');
const closeModalButton = document.getElementById('close-modal');

/**
 * @param {Object} event
 * @param {Array} subscriptions
 * @param {{onSubscribe: Function, onRemove: Function, onReplace: Function, onResult: Function}} actions
 */
export function showModal(event, subscriptions, { onSubscribe, onRemove, onReplace, onResult }) {
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
    const sameSubject = subscriptions.find(s => s.subj === event.subj && !isThis(s) && isActive(s));
    const lock = getLockInfo(event, subscriptions);
    const dependents = getDependents(event.subj);

    // Aviso (resultado / correlativas / otra fecha elegida)
    const note = document.getElementById('modal-note');
    note.className = 'hidden';
    note.innerHTML = '';
    const showNote = (cls, html) => {
        note.className = `rounded-lg border p-3 text-sm ${cls}`;
        note.innerHTML = html;
    };
    if (mine?.result === 'failed') {
        const cut = dependents.filter(d => subscriptions.some(s => s.subj === d && !s.result));
        showNote('bg-red-50 border-red-200 text-red-700',
            `<strong class="block mb-1">❌ No aprobada</strong>
             Elegí otra fecha de esta materia para volver a rendir.
             ${cut.length ? `<span class="block mt-1">Se cortó el camino de: ${cut.map(escapeHtml).join(', ')}.</span>` : ''}`);
    } else if (mine?.result === 'passed') {
        showNote('bg-emerald-50 border-emerald-200 text-emerald-700', '<strong>✅ Aprobada.</strong> ¡Una menos!');
    } else if (lock.locked && !mine) {
        showNote('bg-amber-50 border-amber-200 text-amber-900',
            `<strong class="block mb-1">🔒 Bloqueada por correlativas</strong>
             Primero necesitás, en una fecha <em>anterior</em>:
             <ul class="list-disc ml-5 mt-1">${lock.missing.map(m =>
                `<li>${escapeHtml(m.subj)}${m.failed ? ' <span class="text-red-700">(no aprobada: elegí otra fecha)</span>'
                    : m.subscribedDate ? ` <span class="text-amber-700">(elegiste ${formatShortDate(m.subscribedDate)}, que no es anterior)</span>` : ''}</li>`
            ).join('')}</ul>`);
    } else if (lock.locked && mine) {
        showNote('bg-amber-50 border-amber-200 text-amber-900',
            `⚠️ Te falta la correlativa ${lock.missing.map(m => escapeHtml(m.subj) + (m.failed ? ' (no aprobada)' : '')).join(', ')} en una fecha anterior.`);
    } else if (sameSubject) {
        showNote('bg-blue-50 border-blue-200 text-blue-900',
            escapeHtml(`Ya estás inscripto a esta materia el ${formatShortDate(sameSubject.date)} (${sameSubject.time} h).`));
    }

    // Resultado (solo para fechas tuyas)
    const resultBox = document.getElementById('modal-result');
    resultBox.innerHTML = '';
    resultBox.classList.toggle('hidden', !mine);
    if (mine) {
        const btn = (value, label, on, off) =>
            `<button type="button" data-result="${value}" aria-pressed="${mine.result === value}"
                class="rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors active:scale-95 ${mine.result === value ? on : off}">${label}</button>`;
        resultBox.innerHTML = `
            <p class="text-xs font-semibold text-gray-500 mb-2">¿Cómo te fue?</p>
            <div class="grid grid-cols-2 gap-2">
                ${btn('passed', '✅ Aprobé', 'bg-emerald-600 text-white border-emerald-600', 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100')}
                ${btn('failed', '❌ No aprobé', 'bg-red-600 text-white border-red-600', 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100')}
            </div>
            <p class="text-[11px] text-gray-500 mt-2">${dependents.length
                ? `Es correlativa de ${dependents.map(escapeHtml).join(', ')}: si no aprobás, se corta su camino.`
                : 'Tocá de nuevo para borrar el resultado.'}</p>`;
        resultBox.querySelectorAll('[data-result]').forEach(b => b.addEventListener('click', () => {
            onResult(mine, mine.result === b.dataset.result ? null : b.dataset.result);
        }));
    }

    // Botón principal
    const oldButton = document.getElementById('subscribe-button');
    const button = oldButton.cloneNode(false);
    oldButton.replaceWith(button);
    button.disabled = false;
    const base = 'w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-lg font-semibold text-base sm:text-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100';

    if (mine) {
        button.textContent = mine.result ? 'Quitar de mis fechas' : 'Cancelar inscripción';
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
        button.textContent = subscriptions.some(s => s.subj === event.subj && s.result === 'failed')
            ? 'Volver a rendir acá' : 'Inscribirme';
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
