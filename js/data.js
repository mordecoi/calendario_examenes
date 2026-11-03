// --- CARGADOR DE DATOS DESDE data/events.json ---
const CACHE_KEY = 'events_cache_v2';

let eventsData = [];
let locationDetails = {};
let colors = [];
let correlatives = {};
let config = {};

function apply(data) {
    eventsData = data.events || [];
    locationDetails = data.locations || {};
    colors = data.config?.colors || ['#2563eb'];
    correlatives = data.correlatives || {};
    config = data.config || {};
}

/**
 * Carga los eventos. Si no hay conexión usa la última copia guardada.
 * @returns {Promise<boolean>} true si se cargaron datos frescos
 */
export async function loadData() {
    try {
        const response = await fetch('./data/events.json', { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        apply(data);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* sin storage */ }
        return true;
    } catch (error) {
        console.error('❌ Error al cargar events.json:', error);
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) apply(JSON.parse(cached));
        } catch { /* sin storage */ }
        return false;
    }
}

export function getEvents() { return eventsData; }
export function getLocations() { return locationDetails; }
export function getColors() { return colors; }
export function getCorrelatives() { return correlatives; }
export function getConfig() { return config; }

/** Meses (YYYY-MM) que tienen al menos un examen, ordenados */
export function getMonths() {
    return [...new Set(eventsData.map(e => e.date.slice(0, 7)))].sort();
}
