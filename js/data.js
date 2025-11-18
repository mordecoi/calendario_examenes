// --- CARGADOR DE DATOS DESDE JSON ---
let eventsData = [];
let locationDetails = {};
let colors = [];

/**
 * Carga los datos desde el archivo JSON
 * @returns {Promise<boolean>} True si la carga fue exitosa
 */
export async function loadData() {
    try {
        // Ruta relativa desde la raíz del proyecto (funciona en mobile y desktop)
        const response = await fetch('./data/events.json', {
            cache: 'no-cache', // Asegurar datos frescos en móviles
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        eventsData = data.events;
        locationDetails = data.locations;
        colors = data.config.colors;
        
        console.log('✅ Datos cargados correctamente:', {
            eventos: eventsData.length,
            ubicaciones: Object.keys(locationDetails).length,
            version: data.config.version,
            dispositivo: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'Móvil' : 'Desktop'
        });
        
        return true;
    } catch (error) {
        console.error('❌ Error al cargar datos:', error);
        console.warn('📱 Si estás en móvil, asegúrate de tener conexión a internet');
        // Fallback a datos por defecto
        loadDefaultData();
        return false;
    }
}

/**
 * Carga datos por defecto en caso de error
 */
function loadDefaultData() {
    console.warn('⚠️ Usando datos por defecto (fallback)');
    eventsData = [
        { date: "2025-11-25", time: "16:00", div: "A", prof: "GENCARELLI", subj: "INGINF-2014 LABORATORIO IV", loc: "CAMPUS" },
        { date: "2025-11-25", time: "16:00", div: "B", prof: "GENCARELLI", subj: "INGINF-2014 LABORATORIO IV", loc: "CAMPUS" },
        { date: "2025-11-25", time: "18:00", div: "A", prof: "JOAQUÍN", subj: "INGINF-2014 MÉTODOS NUMÉRICOS", loc: "CAMPUS" },
        { date: "2025-11-25", time: "18:00", div: "B", prof: "JOAQUÍN", subj: "INGINF-2014 MÉTODOS NUMÉRICOS", loc: "CAMPUS" },
        { date: "2025-11-25", time: "18:00", div: "A", prof: "BÍSARO", subj: "INGINF-2014 REDES DE COMPUTADORAS", loc: "CAMPUS" },
        { date: "2025-11-26", time: "18:00", div: "B", prof: "BÍSARO", subj: "INGINF-2014 REDES DE COMPUTADORAS", loc: "CAMPUS" },
        { date: "2025-11-26", time: "17:00", div: "A", prof: "GIOVANARDI", subj: "INGINF-2014 TECNOLOGÍA Y SOCIEDAD", loc: "CAMPUS" },
        { date: "2025-11-26", time: "17:00", div: "B", prof: "GIOVANARDI", subj: "INGINF-2014 TECNOLOGÍA Y SOCIEDAD", loc: "CAMPUS" },
        { date: "2025-11-27", time: "09:00", div: "C", prof: "PEREA", subj: "INGINF-2014 OPTATIVA I", loc: "CAMPUS" },
        { date: "2025-12-02", time: "17:00", div: "A", prof: "CALIGARIS", subj: "INGINF-2014 SISTEMAS DE BASES DE DATOS", loc: "CAMPUS" },
        { date: "2025-12-02", time: "17:00", div: "B", prof: "CALIGARIS", subj: "INGINF-2014 SISTEMAS DE BASES DE DATOS", loc: "CAMPUS" },
        { date: "2025-12-02", time: "19:00", div: "A", prof: "KOLLER", subj: "INGINF-2014 PROGRAMACIÓN DE REDES", loc: "CAMPUS" },
        { date: "2025-12-02", time: "19:00", div: "B", prof: "KOLLER", subj: "INGINF-2014 PROGRAMACIÓN DE REDES", loc: "CAMPUS" },
        { date: "2025-12-04", time: "17:00", div: "A", prof: "DANIELE", subj: "INGINF-2014 PROGRAMACIÓN DECLARATIVA", loc: "CAMPUS" },
        { date: "2025-12-04", time: "17:00", div: "B", prof: "DANIELE", subj: "INGINF-2014 PROGRAMACIÓN DECLARATIVA", loc: "CAMPUS" },
        { date: "2025-12-05", time: "09:00", div: "B", prof: "AMERI LOPEZ LOZANO", subj: "INGINF-2014 INGENIERÍA DE SOFTWARE I", loc: "CAMPUS" },
        { date: "2025-12-05", time: "18:00", div: "A", prof: "ALICIARDI", subj: "INGINF-2014 INGENIERÍA DE SOFTWARE I", loc: "CAMPUS" },
        { date: "2025-12-09", time: "16:00", div: "A", prof: "GENCARELLI", subj: "INGINF-2014 LABORATORIO IV", loc: "CAMPUS" },
        { date: "2025-12-09", time: "16:00", div: "B", prof: "GENCARELLI", subj: "INGINF-2014 LABORATORIO IV", loc: "CAMPUS" },
        { date: "2025-12-09", time: "18:00", div: "A", prof: "JOAQUÍN", subj: "INGINF-2014 MÉTODOS NUMÉRICOS", loc: "CAMPUS" },
        { date: "2025-12-09", time: "18:00", div: "B", prof: "JOAQUÍN", subj: "INGINF-2014 MÉTODOS NUMÉRICOS", loc: "CAMPUS" },
        { date: "2025-12-09", time: "18:00", div: "A", prof: "BÍSARO", subj: "INGINF-2014 REDES DE COMPUTADORAS", loc: "CAMPUS" },
        { date: "2025-12-09", time: "18:00", div: "B", prof: "BÍSARO", subj: "INGINF-2014 REDES DE COMPUTADORAS", loc: "CAMPUS" },
        { date: "2025-12-10", time: "17:00", div: "A", prof: "GIOVANARDI", subj: "INGINF-2014 TECNOLOGÍA Y SOCIEDAD", loc: "CAMPUS" },
        { date: "2025-12-10", time: "17:00", div: "B", prof: "GIOVANARDI", subj: "INGINF-2014 TECNOLOGÍA Y SOCIEDAD", loc: "CAMPUS" },
        { date: "2025-12-11", time: "09:00", div: "C", prof: "PEREA", subj: "INGINF-2014 OPTATIVA I", loc: "CAMPUS" },
        { date: "2025-12-16", time: "17:00", div: "A", prof: "CALIGARIS", subj: "INGINF-2014 SISTEMAS DE BASES DE DATOS", loc: "CAMPUS" },
        { date: "2025-12-16", time: "17:00", div: "B", prof: "CALIGARIS", subj: "INGINF-2014 SISTEMAS DE BASES DE DATOS", loc: "CAMPUS" },
        { date: "2025-12-16", time: "19:00", div: "A", prof: "KOLLER", subj: "INGINF-2014 PROGRAMACIÓN DE REDES", loc: "CAMPUS" },
        { date: "2025-12-16", time: "19:00", div: "B", prof: "KOLLER", subj: "INGINF-2014 PROGRAMACIÓN DE REDES", loc: "CAMPUS" },
        { date: "2025-12-18", time: "17:00", div: "A", prof: "DANIELE", subj: "INGINF-2014 PROGRAMACIÓN DECLARATIVA", loc: "CAMPUS" },
        { date: "2025-12-18", time: "17:00", div: "B", prof: "DANIELE", subj: "INGINF-2014 PROGRAMACIÓN DECLARATIVA", loc: "CAMPUS" },
        { date: "2025-12-19", time: "18:00", div: "A", prof: "ALICIARDI", subj: "INGINF-2014 INGENIERÍA DE SOFTWARE I", loc: "CAMPUS" },
        { date: "2025-12-19", time: "18:00", div: "B", prof: "AMERI LOPEZ LOZANO", subj: "INGINF-2014 INGENIERÍA DE SOFTWARE I", loc: "CAMPUS" },
        { date: "2025-12-01", time: "15:00", div: "E", prof: "", subj: "INGINF-2014 OPTATIVA I", loc: "CORDOBA" },
        { date: "2025-12-01", time: "15:00", div: "F", prof: "", subj: "INGINF-2014 OPTATIVA I", loc: "CORDOBA" },
        { date: "2025-12-01", time: "15:00", div: "H", prof: "", subj: "INGINF-2014 OPTATIVA I", loc: "CORDOBA" },
        { date: "2025-12-01", time: "15:00", div: "M", prof: "", subj: "INGINF-2014 OPTATIVA I", loc: "CORDOBA" },
        { date: "2025-12-15", time: "15:00", div: "E", prof: "", subj: "INGINF-2014 OPTATIVA I", loc: "CORDOBA" },
        { date: "2025-12-15", time: "15:00", div: "F", prof: "", subj: "INGINF-2014 OPTATIVA I", loc: "CORDOBA" },
        { date: "2025-12-15", time: "15:00", div: "H", prof: "", subj: "INGINF-2014 OPTATIVA I", loc: "CORDOBA" },
        { date: "2025-12-15", time: "15:00", div: "M", prof: "", subj: "INGINF-2014 OPTATIVA I", loc: "CORDOBA" }
    ];

    locationDetails = {
        "CAMPUS": {
            address: "DONATO ALVAREZ 380 - (X-5147) - ARGÜELLO - CÓRDOBA - ARGENTINA",
            phone: "+54 (351) 4144444"
        },
        "CORDOBA": {
            address: "AV. DONATO ALVAREZ 380 - CÓRDOBA - CÓRDOBA - ARGENTINA",
            phone: "+54 (351) 4144444"
        }
    };

    colors = [
        'bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-purple-500', 
        'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-yellow-600'
    ];
}

/**
 * Obtiene todos los eventos
 * @returns {Array} Array de eventos
 */
export function getEvents() {
    return eventsData;
}

/**
 * Obtiene los detalles de ubicaciones
 * @returns {Object} Objeto con detalles de ubicaciones
 */
export function getLocations() {
    return locationDetails;
}

/**
 * Obtiene la paleta de colores
 * @returns {Array} Array de colores
 */
export function getColors() {
    return colors;
}
