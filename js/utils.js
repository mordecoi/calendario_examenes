import { getColors } from './data.js';

/**
 * Obtiene un color consistente basado en el nombre de la materia
 * @param {string} subject - Nombre de la materia
 * @returns {string} Clase de Tailwind CSS para el color
 */
export function getColorForSubject(subject) {
    const colors = getColors();
    let hash = 0;
    for (let i = 0; i < subject.length; i++) {
        hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}
