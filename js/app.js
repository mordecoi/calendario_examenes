import { loadData, getEvents, getMonths, getConfig } from './data.js';
import { loadSubscriptions, saveSubscriptions, onSyncStatus, hasPendingChanges, flush } from './storage.js';
import { setToken, getToken, hasWriteAccess } from './cloud.js';
import { findBrokenSubscriptions } from './locks.js';
import { renderMonths, flash } from './calendar.js';
import { renderAgenda } from './agenda.js';
import { renderNextExam } from './nextExam.js';
import { showModal, closeModal, initModalListeners } from './modal.js';
import { renderSubscriptions } from './subscriptions.js';
import { loadFilter, renderFilter, applyFilter, setMissingFilter } from './filter.js';
import { renderMyDates } from './summary.js';
import { eventKey, todayIso, escapeHtml } from './utils.js';

const desktop = window.matchMedia('(min-width: 1024px)');
const $ = id => document.getElementById(id);

const SYNC_PILL = {
    saved:    { text: '☁️ Sincronizado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    saving:   { text: '⏳ Guardando…',   cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    error:    { text: '⚠️ Sin subir',    cls: 'bg-amber-50 text-amber-800 border-amber-200' },
    offline:  { text: '📴 Sin conexión', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
    readonly: { text: '👁️ Solo lectura', cls: 'bg-gray-100 text-gray-600 border-gray-200' }
};

class App {
    constructor() {
        this.subscriptions = [];
        this.validKeys = new Set();
        this.subjects = [];
        this.filter = { subjects: new Set(), missing: false };
        this.lastRefresh = 0;
        this.syncStatus = 'readonly';
    }

    /**
     * Ajusta las inscripciones guardadas a las fechas actuales de events.json.
     * - Si la fecha sigue igual: se queda.
     * - Si cambió horario/división pero la materia sigue ese día: se actualiza sola.
     * - Si es de un período anterior: se descarta.
     * - Si no: se conserva marcada con ⚠️ para que elijas otra (nunca se borra en silencio).
     */
    reconcile = subs => {
        const events = getEvents();
        const firstDate = events.reduce((min, e) => (e.date < min ? e.date : min), events[0].date);
        return subs.flatMap(s => {
            if (this.validKeys.has(eventKey(s))) return [s];
            if (s.date < firstDate) return [];
            const match = events.find(e => e.subj === s.subj && e.date === s.date && e.div === s.div)
                || events.find(e => e.subj === s.subj && e.date === s.date);
            return [match ? { ...match } : s];
        });
    };

    get orphans() {
        return new Set(this.subscriptions.map(eventKey).filter(k => !this.validKeys.has(k)));
    }

    async init() {
        onSyncStatus((status, detail) => this.setSyncStatus(status, detail));

        const fresh = await loadData();
        if (!getEvents().length) {
            $('loading-indicator').innerHTML = '<p class="text-gray-600 px-6 text-center">No se pudieron cargar las fechas. Revisá la conexión y recargá.</p>';
            return;
        }
        this.validKeys = new Set(getEvents().map(eventKey));
        this.subjects = [...new Set(getEvents().map(e => e.subj))].sort();
        this.filter = loadFilter(this.subjects);
        this.subscriptions = await loadSubscriptions(this.reconcile);
        this.lastRefresh = Date.now();

        $('period').textContent = getConfig().period || '';
        $('loading-indicator').classList.add('hidden');
        if (!fresh) this.toast('Sin conexión: mostrando la última copia guardada', 'warn');

        initModalListeners();
        $('settings-button').addEventListener('click', () => this.configureToken());
        $('sync-pill').addEventListener('click', () => this.onPillClick());
        $('reset-button').addEventListener('click', () => this.resetAll());

        // Al volver a la pestaña/app, traer cambios hechos en otro dispositivo
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') this.refreshFromCloud();
        });

        this.render();
        this.initialScroll();
    }

    // ---------- Render ----------

    render() {
        const subs = this.subscriptions;
        const open = e => this.openEvent(e);

        renderNextExam($('next-exam'), subs, open);

        const chosen = new Set(subs.map(s => s.subj));
        const missing = this.subjects.filter(s => !chosen.has(s));
        const broken = findBrokenSubscriptions(subs);
        const orphans = this.orphans;
        const visible = applyFilter(getEvents(), this.filter, subs);
        renderFilter($('subject-filter'), this.subjects, this.filter, missing.length, () => this.render());
        $('agenda-hint').textContent = this.filter.missing
            ? 'Mostrando solo materias sin fecha elegida.'
            : 'Tocá un día del calendario para saltar acá.';

        renderMyDates($('my-dates'), subs, this.subjects, {
            broken,
            orphans,
            missingOn: this.filter.missing,
            onOpen: open,
            onToggleMissing: () => this.toggleMissing()
        });

        renderMonths($('months'), getMonths(), visible, subs, {
            onDayClick: iso => this.jumpToDay(iso),
            renderMonthAgenda: (el, events) => renderAgenda(el, events, subs, { idPrefix: 'am', onEventClick: open })
        });

        const aside = $('agenda-aside');
        const scrollTop = aside.scrollTop;
        renderAgenda($('agenda-list'), visible, subs, { idPrefix: 'ad', groupByMonth: true, onEventClick: open });
        aside.scrollTop = scrollTop;

        renderSubscriptions($('subscriptions-list'), subs, broken, {
            onOpen: open,
            onRemove: sub => this.remove(sub),
            orphans
        });

        // Progreso + materias que faltan (al pie, para el celular)
        $('subscriptions-progress').textContent =
            `${chosen.size} de ${this.subjects.length} materias con fecha elegida`;
        const bottom = $('missing-bottom');
        bottom.innerHTML = missing.length ? `
            <button type="button" class="w-full text-left text-sm rounded-2xl px-4 py-3 border ${
                this.filter.missing ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-900 border-amber-200'
            }">
                <strong>Faltan ${missing.length}:</strong> ${missing.map(escapeHtml).join(', ')}
                <span class="block mt-1 font-semibold">${this.filter.missing ? 'Mostrando solo estas · tocá para ver todas' : 'Ver solo sus fechas ↑'}</span>
            </button>` : '';
        bottom.querySelector('button')?.addEventListener('click', () => {
            this.toggleMissing();
            if (this.filter.missing) $('subject-filter').scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    initialScroll() {
        const today = todayIso();
        // PC: la agenda arranca en el próximo día con exámenes
        const next = [...document.querySelectorAll('#agenda-list .agenda-day')].find(el => el.dataset.date >= today);
        if (next) this.scrollAside(next, false);

        // Celular: ir al mes actual si no es el primero
        const months = getMonths();
        const current = today.slice(0, 7);
        if (!desktop.matches && months.includes(current) && months[0] !== current) {
            $(`m-${current}`)?.scrollIntoView({ block: 'start' });
        }
    }

    scrollAside(el, smooth = true) {
        const aside = $('agenda-aside');
        const header = aside.querySelector('h3')?.offsetHeight || 0;
        aside.scrollTo({ top: el.offsetTop - header - 4, behavior: smooth ? 'smooth' : 'auto' });
    }

    jumpToDay(iso) {
        if (desktop.matches) {
            const el = $(`ad-${iso}`);
            if (el) { this.scrollAside(el); flash(el); }
        } else {
            const el = $(`am-${iso}`);
            if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); flash(el); }
        }
    }

    // ---------- Acciones ----------

    toggleMissing() {
        setMissingFilter(this.filter, !this.filter.missing);
        this.render();
    }

    openEvent(event) {
        showModal(event, this.subscriptions, {
            onSubscribe: e => {
                this.subscriptions = [...this.subscriptions, e];
                this.persist('Inscripción guardada');
            },
            onRemove: sub => this.remove(sub),
            onReplace: (old, e) => {
                this.subscriptions = [...this.subscriptions.filter(s => eventKey(s) !== eventKey(old)), e];
                this.persist('Fecha cambiada');
            }
        });
    }

    remove(sub) {
        this.subscriptions = this.subscriptions.filter(s => eventKey(s) !== eventKey(sub));
        this.persist('Inscripción cancelada');
    }

    resetAll() {
        if (!this.subscriptions.length) return this.toast('No hay inscripciones para borrar', 'warn');
        if (!confirm(`¿Borrar tus ${this.subscriptions.length} inscripciones?`)) return;
        this.subscriptions = [];
        this.persist('Inscripciones borradas');
    }

    persist(message) {
        saveSubscriptions(this.subscriptions);
        closeModal();
        this.render();
        const suffix = hasWriteAccess() ? '' : ' (solo en este dispositivo)';
        this.toast(message + suffix, hasWriteAccess() ? 'success' : 'warn');
    }

    async refreshFromCloud() {
        if (hasPendingChanges() || Date.now() - this.lastRefresh < 20000) return;
        this.lastRefresh = Date.now();
        const before = JSON.stringify(this.subscriptions);
        this.subscriptions = await loadSubscriptions(this.reconcile);
        if (JSON.stringify(this.subscriptions) !== before) this.render();
    }

    // ---------- Sincronización ----------

    setSyncStatus(status, detail = '') {
        this.syncStatus = status;
        const pill = $('sync-pill');
        const conf = SYNC_PILL[status] || SYNC_PILL.readonly;
        pill.textContent = conf.text;
        pill.className = `text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${conf.cls}`;
        pill.title = detail || (status === 'readonly' ? 'Configurá el token (⚙️) para guardar en la nube' : '');
    }

    onPillClick() {
        if (this.syncStatus === 'error' || this.syncStatus === 'offline') {
            if (hasPendingChanges()) flush();
            else this.refreshFromCloud();
        } else if (this.syncStatus === 'readonly') {
            this.configureToken();
        }
    }

    async configureToken() {
        const current = getToken();
        const token = prompt(
            'Token de GitHub para guardar tus inscripciones en la nube.\n\n' +
            'Crealo en github.com → Settings → Developer settings → Fine-grained tokens, ' +
            'solo para el repo calendario_examenes, con permiso "Contents: Read and write".\n\n' +
            'Se guarda solo en este dispositivo. Dejalo vacío para modo solo lectura.',
            current
        );
        if (token === null) return;
        setToken(token);
        this.subscriptions = await loadSubscriptions(this.reconcile);
        this.render();
        this.toast(hasWriteAccess() ? 'Token guardado: los cambios se sincronizan solos' : 'Modo solo lectura', 'success');
    }

    toast(message, type = 'success') {
        const colors = { success: 'bg-gray-900', warn: 'bg-amber-600', error: 'bg-red-600' };
        const el = document.createElement('div');
        el.className = `${colors[type] || colors.success} text-white fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl shadow-lg text-sm z-[60] max-w-[90vw] text-center`;
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2600);
    }
}

document.addEventListener('DOMContentLoaded', () => new App().init());
