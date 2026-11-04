// --- VISTA MONTAÑA ---
// Mapa fijo: cada fecha de examen es un lugar fijo de la montaña (abajo = noviembre, arriba = marzo).
// Capa estática: cielo, montaña, árboles, refugios, hitos de altura. Se arma una sola vez (o al cambiar el ancho).
// Capa dinámica: tu sendero (las fechas elegidas), senderos laterales, estados de cada fecha y el escalador.
import { getEventState, findBrokenSubscriptions, isActive, isMine } from './locks.js';
import { isDark } from './theme.js';
import {
    eventKey, byDateTime, daysBetween, parseIso, formatShortDate, formatMonth, MONTHS_SHORT,
    getColorForSubject, subjectAbbr, escapeHtml, countdownLabel
} from './utils.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ROW_H = 88;
const REST_H = 170;
const BASE_H = 150;
const SUMMIT_H = 300;
const REST_MIN_GAP = 5;     // más de 5 días sin exámenes → refugio
const BASE_ALT = 800;       // metros en el campamento base
const ALT_STEP = 100;       // metros por día de examen
const NODE = 34;            // diámetro de cada fecha

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Paleta de día y de noche (modo oscuro)
const PALETTES = {
    day: {
        sky: ['#7cb3f0', '#cfe6fb', '#eaf6ff'], cloud: '#ffffff', cloudOpacity: 0.85,
        far: '#a5b4fc', farOpacity: 0.5, massif: ['#5f9e48', '#7aa35a', '#998b74', '#7f7468'],
        snow: '#f8fafc', shade: 0.1, contour: '#1c1917', contourOpacity: 0.08,
        river: ['#1d4ed8', '#60a5fa', '#dbeafe'], rock: ['#78716c', '#a8a29e'],
        trunk: '#5b3a1e', trees: ['#2f6b3a', '#3d7f47'], camps: 'from-[#7fb565] to-[#5f9a4a]',
        otherBg: '#ffffff', lockedBg: '#d6d3d1', lockedFg: '#57534e', trailEdge: '#ffffff', night: false
    },
    night: {
        sky: ['#0f1a33', '#1d2b4d', '#2a3a5e'], cloud: '#94a3b8', cloudOpacity: 0.3,
        far: '#3b4775', farOpacity: 0.6, massif: ['#2c4f30', '#38563a', '#4a4650', '#3f3b45'],
        snow: '#c8d1e0', shade: 0.2, contour: '#ffffff', contourOpacity: 0.05,
        river: ['#1e3a8a', '#3563c9', '#a5c4f5'], rock: ['#4b4a52', '#6b6a73'],
        trunk: '#3a2a1c', trees: ['#1d4429', '#275535'], camps: 'from-[#2f5233] to-[#24412a]',
        otherBg: '#20242d', lockedBg: '#4a4f5c', lockedFg: '#c3c8d2', trailEdge: '#0f172a', night: true
    }
};
const palette = () => (isDark() ? PALETTES.night : PALETTES.day);

// Estado del módulo (para no rehacer la capa estática y animar cambios)
let staticSig = null;
let map = null;
let prevRouteD = null;
let prevChosen = null;

// ---------------------------------------------------------------------------
// Modelo (funciones puras)
// ---------------------------------------------------------------------------

/**
 * Filas de abajo hacia arriba: base, [refugio], día, día, [refugio], día, …, cumbre
 */
export function buildMap(events, today) {
    const days = [...new Set(events.map(e => e.date))].sort();
    const items = [{ type: 'base', date: today }];
    let prev = today;
    let dayIndex = 0;
    for (const date of days) {
        const gap = daysBetween(prev, date);
        if (gap > REST_MIN_GAP) {
            items.push({ type: 'rest', from: prev, to: date, days: gap, fromBase: items.length === 1 });
        }
        dayIndex++;
        items.push({
            type: 'day',
            date,
            altitude: BASE_ALT + dayIndex * ALT_STEP,
            events: events.filter(e => e.date === date).sort(byDateTime)
        });
        prev = date;
    }
    items.push({ type: 'summit', date: days[days.length - 1], altitude: BASE_ALT + (dayIndex + 1) * ALT_STEP });
    return items;
}

/** Altura del río que cruza el valle de un refugio, en la posición x */
function riverYAt(rest, x) {
    return rest.y + 50 + Math.sin(x / 55 + rest.y) * 8;
}

/**
 * Sendero de montaña entre puntos clave: zigzags de lado a lado y, cada tanto,
 * una bajada (el camino pierde altura antes de volver a subir).
 */
function meander(pts, m) {
    const { W, items } = m;
    const P = items[items.length - 1].peakY;
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const dy = a.y - b.y;
        const n = Math.floor(dy / 150);
        const step = dy / (n + 1);
        const seed = Math.round(a.y) + Math.round(b.y);
        for (let k = 1; k <= n; k++) {
            const f = k / (n + 1);
            let y = a.y - dy * f;
            if (k % 3 === 0) y += step * 1.35;
            const amp = Math.min(W * 0.26, Math.max(W * 0.04, (y - P) * 0.5));
            const side = (k + seed) % 2 ? 1 : -1;
            const x = a.x + (b.x - a.x) * f + side * amp * (0.6 + 0.4 * rand(seed, k));
            out.push({ x: Math.min(W * 0.94, Math.max(W * 0.06, x)), y, kind: 'wp' });
        }
        out.push(b);
    }
    return out;
}

function restName(rest) {
    if (rest.fromBase) return 'Refugio del valle';
    if (rest.days >= 30) return 'Refugio de verano';
    return 'Refugio';
}

/** Posiciones en píxeles para un ancho dado */
function layout(items, W) {
    const height = { base: BASE_H, rest: REST_H, day: ROW_H, summit: SUMMIT_H };
    const H = items.reduce((sum, it) => sum + height[it.type], 0);
    const n = items.length;
    let cursor = H;
    let singles = 0;
    const nodes = new Map();

    items.forEach((it, i) => {
        const h = height[it.type];
        it.top = cursor - h;
        it.bottom = cursor;
        it.y = cursor - h / 2;
        cursor -= h;
        const t = i / (n - 1);
        it.t = t;
        it.cx = W / 2 + Math.sin(i * 0.7) * W * 0.035 * (1 - t);
        it.spread = W * (0.80 - 0.36 * t);
        if (it.type === 'rest') {
            it.labelRight = it.cx < W / 2 + 10;
            it.trailX = it.cx + (it.labelRight ? -46 : 46);
        }

        if (it.type === 'day') {
            const count = it.events.length;
            it.nodes = it.events.map((event, j) => {
                const x = count === 1
                    ? it.cx + it.spread * 0.22 * (singles++ % 2 ? 1 : -1)
                    : it.cx - it.spread / 2 + it.spread * (j + 0.5) / count;
                const node = { event, key: eventKey(event), x, y: it.y, itemIndex: i };
                nodes.set(node.key, node);
                return node;
            });
        }
    });
    const summit = items[n - 1];
    summit.peakY = summit.top + 80;
    summit.y = summit.top + 120;
    return { items, W, H, nodes };
}

/**
 * Tu ruta: base → fechas elegidas (pasando por los refugios que cruza) → cumbre
 */
export function buildRoute(subscriptions, m, todayIso) {
    const { items, nodes } = m;
    const base = items[0];
    const summit = items[items.length - 1];
    const dayNum = iso => parseIso(iso).getTime() / 86400000;

    const chosen = [...subscriptions].sort(byDateTime)
        .map(s => nodes.get(eventKey(s)))
        .filter(Boolean);

    const withRests = (fromIdx, toIdx) => items
        .map((it, i) => ({ it, i }))
        .filter(({ it, i }) => it.type === 'rest' && i > fromIdx && i < toIdx);

    // Cruce de cada refugio: por el puente, justo al lado de la cabaña
    const restPoints = (it, i) => {
        const by = riverYAt(it, it.trailX);
        return [
            { x: it.trailX, y: by + 26, kind: 'rest', itemIndex: i },
            { x: it.trailX, y: by - 26, kind: 'rest', itemIndex: i }
        ];
    };

    // Puntos clave del sendero elegido
    const keyPts = [{ x: base.cx, y: base.y - 18, t: -Infinity, kind: 'base', itemIndex: 0 }];
    chosen.forEach(node => {
        const last = keyPts[keyPts.length - 1];
        withRests(last.itemIndex, node.itemIndex).forEach(({ it, i }) => keyPts.push(...restPoints(it, i)));
        keyPts.push({ x: node.x, y: node.y, t: dayNum(node.event.date), kind: 'stop', key: node.key, itemIndex: node.itemIndex });
    });
    const points = meander(keyPts, m);
    const restsCrossed = new Set(keyPts.filter(p => p.kind === 'rest').map(p => p.itemIndex)).size;

    // Fechas para los puntos intermedios (para ubicar al escalador)
    points.forEach((p, i) => {
        if (p.kind === 'stop' || p.kind === 'base') return;
        let prev = i - 1;
        while (points[prev].kind !== 'stop' && points[prev].kind !== 'base') prev--;
        let next = i + 1;
        while (points[next].kind !== 'stop') next++;
        p.t = points[prev].t === -Infinity
            ? points[next].t - 0.5
            : points[prev].t + (points[next].t - points[prev].t) * (i - prev) / (next - prev);
    });

    // Lo que falta hasta la cumbre (punteado)
    const last = keyPts[keyPts.length - 1];
    const remKey = [{ x: last.x, y: last.y }];
    withRests(last.itemIndex, items.length - 1).forEach(({ it, i }) => remKey.push(...restPoints(it, i)));
    remKey.push({ x: summit.cx, y: summit.peakY + 6 });
    const remaining = meander(remKey, m);

    // Escalador: último punto ya pasado y el siguiente
    const today = dayNum(todayIso);
    let climber = { segment: -1, fraction: 0 };
    for (let i = points.length - 1; i >= 0; i--) {
        if (points[i].t <= today) {
            if (points[i].kind === 'base' || i === points.length - 1) {
                climber = { segment: -1, at: i };
            } else {
                const a = points[i].t;
                const b = points[i + 1].t;
                climber = { segment: i, fraction: Math.min(1, Math.max(0, (today - a) / (b - a))) };
            }
            break;
        }
    }

    return { points, remaining, chosen, climber, restsCrossed };
}

// ---------------------------------------------------------------------------
// Utilidades de dibujo
// ---------------------------------------------------------------------------

const f1 = n => Math.round(n * 10) / 10;

/** Catmull-Rom → segmentos Bézier cúbicos */
function splineSegments(pts) {
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] || p2;
        const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
        const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
        segs.push(`C ${f1(c1.x)} ${f1(c1.y)} ${f1(c2.x)} ${f1(c2.y)} ${f1(p2.x)} ${f1(p2.y)}`);
    }
    return segs;
}

function splinePath(pts) {
    if (pts.length < 2) return '';
    return `M ${f1(pts[0].x)} ${f1(pts[0].y)} ` + splineSegments(pts).join(' ');
}

function segmentPath(pts, i) {
    return `M ${f1(pts[i].x)} ${f1(pts[i].y)} ` + splineSegments(pts)[i];
}

function rand(i, k) {
    const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return s - Math.floor(s);
}

function el(tag, attrs = {}, parent) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
}

// ---------------------------------------------------------------------------
// Capa estática
// ---------------------------------------------------------------------------

function buildStatic(scene, m) {
    const { items, W, H } = m;
    const C = palette();
    scene.innerHTML = '';
    scene.style.height = `${H}px`;

    const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'absolute inset-0', 'aria-hidden': 'true' });
    const defs = el('defs', {}, svg);
    defs.innerHTML = `
        <linearGradient id="mt-sky" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="${C.sky[0]}"/><stop offset="0.55" stop-color="${C.sky[1]}"/><stop offset="1" stop-color="${C.sky[2]}"/>
        </linearGradient>
`;

    el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#mt-sky)' }, svg);
    if (C.night) {
        // Estrellas y luna
        for (let i = 0; i < 60; i++) {
            el('circle', {
                cx: f1(rand(i, 61) * W), cy: f1(rand(i, 62) * (items[items.length - 1].peakY + 260)),
                r: f1(0.6 + rand(i, 63) * 1.1), fill: '#ffffff', class: 'star',
                style: `animation-delay:-${f1(rand(i, 64) * 3)}s`
            }, svg);
        }
        el('circle', { cx: W * 0.84, cy: 70, r: 48, fill: '#e2e8f0', opacity: 0.1 }, svg);
        el('circle', { cx: W * 0.84, cy: 70, r: 26, fill: '#e2e8f0' }, svg);
        el('circle', { cx: W * 0.84 - 8, cy: 64, r: 5, fill: '#cbd5e1' }, svg);
        el('circle', { cx: W * 0.84 + 9, cy: 78, r: 3.5, fill: '#cbd5e1' }, svg);
    } else {
        el('circle', { cx: W * 0.84, cy: 70, r: 34, fill: '#fde68a', opacity: 0.9 }, svg);
    }

    const summit = items[items.length - 1];
    const P = summit.peakY;
    const peak = { x: summit.cx, y: P };

    // Roca arriba, pasto abajo
    const rockStart = Math.max(0.55, 1 - 900 / H);
    defs.insertAdjacentHTML('beforeend', `
        <linearGradient id="mt-massif" x1="0" y1="${H}" x2="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="${C.massif[0]}"/><stop offset="${f1(rockStart - 0.22)}" stop-color="${C.massif[1]}"/>
            <stop offset="${f1(rockStart)}" stop-color="${C.massif[2]}"/><stop offset="1" stop-color="${C.massif[3]}"/>
        </linearGradient>`);

    // Nubes (en el cielo, sobre la cordillera)
    for (let i = 0; i < 5; i++) {
        const g = el('g', { class: 'cloud', style: `animation-duration:${12 + i * 3}s;animation-delay:-${i * 2}s` }, svg);
        let cx = W * (0.08 + rand(i, 1) * 0.84);
        if (Math.abs(cx - W / 2) < W * 0.16) cx += (cx < W / 2 ? -1 : 1) * W * 0.22; // no tapar la cumbre
        const cy = 22 + rand(i, 2) * (P + 90);
        const s = 0.7 + rand(i, 3) * 0.6;
        [[0, 0, 26, 12], [-18, 4, 18, 9], [20, 5, 20, 9]].forEach(([dx, dy, rx, ry]) =>
            el('ellipse', { cx: cx + dx * s, cy: cy + dy * s, rx: rx * s, ry: ry * s, fill: C.cloud, opacity: C.cloudOpacity }, g));
    }

    // Cordillera lejana (detrás)
    const far = [[0, 150], [0.07, 70], [0.16, 165], [0.27, 40], [0.38, 145], [0.5, 95], [0.62, 150], [0.73, 30], [0.84, 135], [0.94, 60], [1, 120]];
    el('path', {
        d: 'M ' + far.map(([fx, dy]) => `${f1(fx * W)} ${f1(P + dy)}`).join(' L ') + ` L ${W} ${P + 600} L 0 ${P + 600} Z`,
        fill: C.far, opacity: C.farOpacity
    }, svg);

    // Macizo principal: ancho abajo y con varias cumbres arriba (la del medio es la cumbre)
    const ridgeKeys = [[0, 420], [0.1, 110], [0.2, 200], [0.3, 60], [0.4, Math.min(130, W * 0.25)], [0.5, 0],
        [0.6, Math.min(130, W * 0.25)], [0.7, 60], [0.8, 200], [0.9, 110], [1, 400]];
    const ridge = [];
    ridgeKeys.forEach(([fx, dy], k) => {
        const pt = { x: fx * W, y: P + dy };
        if (k > 0) {
            const prev = ridge[ridge.length - 1];
            for (let sub = 1; sub <= 2; sub++) {
                const f = sub / 3;
                ridge.push({ x: prev.x + (pt.x - prev.x) * f, y: prev.y + (pt.y - prev.y) * f + (rand(k, sub) - 0.5) * 22 });
            }
        }
        ridge.push(pt);
    });
    const massifD = `M 0 ${H} ` + ridge.map(q => `L ${f1(q.x)} ${f1(q.y)}`).join(' ') + ` L ${W} ${H} Z`;
    el('path', { d: massifD, fill: 'url(#mt-massif)' }, svg);

    // Nieve en las cumbres (recortada con borde dentado)
    const snowLine = P + 150;
    const jag = [];
    for (let x = W, k = 0; x > -14; x -= 14, k++) {
        jag.push(`${f1(Math.max(0, x))},${f1(snowLine + (k % 2 ? 10 : -6) + rand(k, 9) * 8)}`);
    }
    defs.insertAdjacentHTML('beforeend', `<clipPath id="mt-snow"><polygon points="0,0 ${W},0 ${jag.join(' ')}"/></clipPath>`);
    el('path', { d: massifD, fill: C.snow, 'clip-path': 'url(#mt-snow)' }, svg);

    // Sombra en la ladera derecha de cada cumbre
    [[0.1, 110], [0.3, 60], [0.5, 0], [0.7, 60], [0.9, 110]].forEach(([fx, dy]) => {
        const px = fx * W;
        const py = P + dy;
        el('polygon', {
            points: `${f1(px)},${f1(py)} ${f1(px + W * 0.09)},${f1(py + W * 0.16 + 40)} ${f1(px + W * 0.015)},${f1(py + W * 0.3 + 60)}`,
            fill: '#000000', opacity: C.shade
        }, svg);
    });

    // Curvas de nivel (como un mapa topográfico)
    for (let y = P + 330, k = 0; y < H - 120; y += 260, k++) {
        const pts = [];
        for (let x = -20; x <= W + 20; x += 40) {
            pts.push({ x, y: y + Math.sin(x / 90 + k) * 14 + Math.sin(x / 37 + k * 2) * 5 });
        }
        el('path', { d: splinePath(pts), fill: 'none', stroke: C.contour, 'stroke-opacity': C.contourOpacity, 'stroke-width': 1.5 }, svg);
    }

    // Ríos en los valles de los refugios, con un puente donde cruza el sendero
    items.forEach((it, i) => {
        if (it.type !== 'rest') return;
        const pts = [];
        for (let x = -20; x <= W + 20; x += 30) pts.push({ x, y: riverYAt(it, x) });
        const d = splinePath(pts);
        el('path', { d, fill: 'none', stroke: C.river[0], 'stroke-width': 19, 'stroke-linecap': 'round', opacity: 0.55 }, svg);
        el('path', { d, fill: 'none', stroke: C.river[1], 'stroke-width': 13, 'stroke-linecap': 'round' }, svg);
        el('path', { d, fill: 'none', stroke: C.river[2], 'stroke-width': 2, 'stroke-dasharray': '8 16', 'stroke-linecap': 'round', class: 'river-flow' }, svg);
        const by = riverYAt(it, it.trailX);
        const bridge = el('g', { transform: `translate(${f1(it.trailX)} ${f1(by)})`, 'data-bridge': i }, svg);
        bridge.innerHTML = `
            <rect x="-11" y="-18" width="22" height="36" rx="2" fill="#a16207"/>
            ${[-12, -6, 0, 6, 12].map(yy => `<line x1="-11" x2="11" y1="${yy}" y2="${yy}" stroke="#713f12" stroke-width="1.2"/>`).join('')}
            <line x1="-12.5" x2="-12.5" y1="-19" y2="19" stroke="#57534e" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="12.5" x2="12.5" y1="-19" y2="19" stroke="#57534e" stroke-width="2.5" stroke-linecap="round"/>`;
    });

    // Rocas sueltas
    items.forEach((it, i) => {
        if (it.type !== 'day' || i % 2) return;
        const x = W * (0.05 + rand(i, 21) * 0.9);
        if (it.nodes.some(nd => Math.abs(nd.x - x) < 32)) return;
        const y = it.top + 6 + rand(i, 22) * 10;
        const s = 0.7 + rand(i, 23) * 0.7;
        el('polygon', { points: `${f1(x - 10 * s)},${f1(y + 5 * s)} ${f1(x - 6 * s)},${f1(y - 4 * s)} ${f1(x + 2 * s)},${f1(y - 7 * s)} ${f1(x + 10 * s)},${f1(y + 5 * s)}`, fill: C.rock[0] }, svg);
        el('polygon', { points: `${f1(x - 6 * s)},${f1(y - 4 * s)} ${f1(x + 2 * s)},${f1(y - 7 * s)} ${f1(x)},${f1(y)}`, fill: C.rock[1] }, svg);
    });

    // Bosque en las laderas bajas
    items.forEach((it, i) => {
        if (it.t > 0.6 || it.type === 'summit') return;
        const count = it.type === 'base' ? 8 : it.type === 'rest' ? 5 : 3;
        for (let r = 0; r < count; r++) {
            const x = W * (0.03 + rand(i, r + 30) * 0.94);
            let y;
            if (it.type === 'base') {
                if (Math.abs(x - it.cx) < 70) continue;
                y = it.y + (rand(i, r + 40) - 0.5) * 70;
            } else if (it.type === 'rest') {
                if (Math.abs(x - it.cx) < 60 || Math.abs(x - it.trailX) < 24) continue;
                y = it.top + 12 + rand(i, r + 40) * 26;
            } else {
                if (it.nodes.some(nd => Math.abs(nd.x - x) < 26)) continue;
                y = it.top + 6 + rand(i, r + 40) * 12;
            }
            const s = 0.8 + rand(i, r + 50) * 0.5;
            el('rect', { x: f1(x - 1.5 * s), y: f1(y + 6 * s), width: f1(3 * s), height: f1(6 * s), fill: C.trunk }, svg);
            el('polygon', { points: `${f1(x)},${f1(y - 16 * s)} ${f1(x - 8 * s)},${f1(y + 7 * s)} ${f1(x + 8 * s)},${f1(y + 7 * s)}`, fill: C.trees[(i + r) % 3 ? 0 : 1] }, svg);
        }
    });

    // Refugios (estáticos)
    items.forEach((it, i) => {
        if (it.type !== 'rest') return;
        const g = el('g', { transform: `translate(${f1(it.cx)} ${f1(it.y)})`, 'data-rest': i }, svg);
        g.innerHTML = `
            <ellipse cx="0" cy="17" rx="34" ry="6" fill="#000" opacity="0.12"/>
            <rect x="12" y="-30" width="6" height="14" fill="#57534e"/>
            <circle class="smoke" cx="15" cy="-36" r="4" fill="#e5e7eb"/>
            <circle class="smoke" cx="18" cy="-40" r="5" fill="#e5e7eb" style="animation-delay:-1.5s"/>
            <rect x="-20" y="-8" width="40" height="24" rx="2" fill="#b45309"/>
            <rect x="-20" y="-8" width="40" height="3" fill="#92400e"/>
            <polygon points="-25,-6 0,-28 25,-6" fill="#7c2d12"/>
            <rect x="-5" y="2" width="10" height="14" rx="1" fill="#451a03"/>
            <rect x="-16" y="-1" width="8" height="7" fill="#fde68a"/>
            <rect x="8" y="-1" width="8" height="7" fill="#fde68a"/>
            ${C.night ? '<circle cx="-12" cy="2.5" r="11" fill="#fde68a" opacity=".22"/><circle cx="12" cy="2.5" r="11" fill="#fde68a" opacity=".22"/>' : ''}`;
    });

    // Bandera de la cumbre
    const flag = el('g', { transform: `translate(${f1(peak.x)} ${f1(peak.y)})` }, svg);
    flag.innerHTML = `
        <rect x="-1.5" y="-34" width="3" height="36" fill="#44403c"/>
        <polygon points="1.5,-34 26,-26 1.5,-18" fill="#dc2626"/>`;

    // Carpa del campamento base
    const base = items[0];
    const tent = el('g', { transform: `translate(${f1(base.cx)} ${f1(base.y + 22)})` }, svg);
    tent.innerHTML = `
        <ellipse cx="0" cy="14" rx="40" ry="6" fill="#000" opacity="0.1"/>
        <polygon points="-26,14 0,-20 26,14" fill="#f97316"/>
        <polygon points="-6,14 0,-2 6,14" fill="#7c2d12"/>
        <line x1="0" y1="-20" x2="0" y2="-28" stroke="#44403c" stroke-width="2"/>`;

    scene.appendChild(svg);

    // Capa del sendero (dinámica, va arriba de la montaña)
    const route = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'route-svg absolute inset-0 pointer-events-none', 'aria-hidden': 'true' });
    scene.appendChild(route);

    // Etiquetas estáticas (HTML)
    const labels = document.createElement('div');
    labels.className = 'absolute inset-0 pointer-events-none';
    let html = '';
    let lastMonth = null;
    items.forEach(it => {
        if (it.type === 'day') {
            const ym = it.date.slice(0, 7);
            if (ym !== lastMonth) {
                lastMonth = ym;
                html += `
                    <div class="absolute left-0 right-0 border-t border-dashed border-white/70" style="top:${f1(it.bottom)}px"></div>
                    <div class="absolute left-2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wide text-white bg-black/30 backdrop-blur-sm rounded px-1.5 py-0.5" style="top:${f1(it.bottom)}px">
                        ${formatMonth(ym)} · <span class="normal-case">${it.altitude.toLocaleString('es-AR')} m</span>
                    </div>`;
            }
        } else if (it.type === 'rest') {
            const onRight = it.labelRight;
            html += `
                <div class="rest-label absolute -translate-y-1/2 text-[11px] leading-tight bg-white/90 text-amber-900 rounded-lg shadow px-2 py-1 max-w-[46%]"
                     style="top:${f1(it.y)}px;${onRight ? `left:${f1(it.cx + 36)}px` : `right:${f1(W - it.cx + 36)}px`}">
                    <strong class="block">🏠 ${restName(it)}</strong>${it.days} días sin exámenes
                </div>`;
        } else if (it.type === 'summit') {
            html += `
                <div class="absolute -translate-x-1/2 text-center" style="left:${f1(it.cx)}px;top:${f1(it.peakY + 14)}px">
                    <span class="summit-label inline-block text-xs font-bold bg-white/90 text-gray-900 rounded-full shadow px-3 py-1 whitespace-nowrap">🏁 Cumbre · ${it.altitude.toLocaleString('es-AR')} m</span>
                </div>`;
        } else if (it.type === 'base') {
            html += `
                <div class="absolute -translate-x-1/2 text-center" style="left:${f1(it.cx)}px;top:${f1(it.y + 44)}px">
                    <span class="inline-block text-xs font-bold bg-white/90 text-gray-900 rounded-full shadow px-3 py-1 whitespace-nowrap">⛺ Campamento base · ${BASE_ALT} m</span>
                </div>`;
        }
    });
    labels.innerHTML = html;
    scene.appendChild(labels);

    // Capa de fechas (se rehace en cada cambio)
    const nodeLayer = document.createElement('div');
    nodeLayer.className = 'node-layer absolute inset-0';
    scene.appendChild(nodeLayer);
}

// ---------------------------------------------------------------------------
// Capa dinámica
// ---------------------------------------------------------------------------

function drawRoute(scene, m, route, broken) {
    const svg = scene.querySelector('.route-svg');
    const old = svg.querySelector('g.route');
    const g = el('g', { class: 'route' });

    const { points, remaining, chosen } = route;

    // Lo que falta hasta la cumbre
    el('path', {
        d: splinePath(remaining), fill: 'none', stroke: '#57534e', 'stroke-width': 3,
        'stroke-dasharray': '1 9', 'stroke-linecap': 'round', opacity: 0.55, class: 'route-fade remaining-trail'
    }, g);

    // Tu sendero
    const d = points.length > 1 ? splinePath(points) : '';
    if (d) {
        el('path', { d, fill: 'none', stroke: palette().trailEdge, 'stroke-width': 13, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.55, class: 'route-fade' }, g);
        const main = el('path', { d, fill: 'none', stroke: '#b7793f', 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'main-trail', 'data-rests': route.restsCrossed }, g);
        el('path', { d, fill: 'none', stroke: '#fef3c7', 'stroke-width': 2, 'stroke-dasharray': '5 9', 'stroke-linecap': 'round', class: 'route-fade' }, g);

        // Tramos cortados (correlativa sin cumplir)
        points.forEach((p, i) => {
            if (i === 0 || p.kind !== 'stop' || !broken.has(p.key)) return;
            let from = i - 1;
            while (from > 0 && points[from].kind !== 'stop' && points[from].kind !== 'base') from--;
            for (let s = from; s < i; s++) {
                el('path', { d: segmentPath(points, s), fill: 'none', stroke: '#dc2626', 'stroke-width': 4, 'stroke-dasharray': '5 6', 'stroke-linecap': 'round', class: 'broken-trail' }, g);
            }
        });

        svg.appendChild(g);

        // Senderos laterales: desde el punto más cercano de tu sendero hasta cada otra fecha
        // de las materias que elegiste (tocarla ofrece "Cambiar a esta fecha")
        const side = el('g', { class: 'route-fade' });
        g.insertBefore(side, g.firstChild);
        const total = main.getTotalLength();
        const samples = [];
        for (let l = 0; l <= total; l += 12) samples.push(main.getPointAtLength(l));
        chosen.forEach(node => {
            const color = getColorForSubject(node.event.subj);
            m.nodes.forEach(other => {
                if (other.event.subj !== node.event.subj || other.key === node.key) return;
                let best = samples[0];
                let bestDist = Infinity;
                for (const p of samples) {
                    const dist = (p.x - other.x) ** 2 + (p.y - other.y) ** 2;
                    if (dist < bestDist) { bestDist = dist; best = p; }
                }
                const mx = (best.x + other.x) / 2;
                const my = (best.y + other.y) / 2 - 12;
                el('path', {
                    d: `M ${f1(best.x)} ${f1(best.y)} Q ${f1(mx)} ${f1(my)} ${f1(other.x)} ${f1(other.y)}`,
                    fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-dasharray': '1 6',
                    'stroke-linecap': 'round', opacity: 0.8, class: 'side-trail'
                }, side);
            });
        });

        const animate = d !== prevRouteD && !reducedMotion.matches;
        if (animate) {
            const len = main.getTotalLength();
            main.style.strokeDasharray = `${len}`;
            main.style.strokeDashoffset = `${len}`;
            main.getBoundingClientRect(); // fuerza el estilo inicial
            main.classList.add('trail-draw');
            main.style.strokeDashoffset = '0';
            setTimeout(() => { main.style.strokeDasharray = ''; }, 1000);
        }
    } else {
        svg.appendChild(g);
    }
    prevRouteD = d;

    if (old) {
        if (reducedMotion.matches) old.remove();
        else {
            old.classList.add('route-out');
            setTimeout(() => old.remove(), 320);
        }
    }

    return svg;
}

function climberPosition(svg, route) {
    const { points, climber } = route;
    if (climber.segment < 0) {
        const p = points[climber.at ?? 0];
        return { x: p.x, y: p.y };
    }
    const tmp = el('path', { d: segmentPath(points, climber.segment), fill: 'none', visibility: 'hidden' }, svg);
    const pt = tmp.getPointAtLength(tmp.getTotalLength() * climber.fraction);
    tmp.remove();
    return { x: pt.x, y: pt.y };
}

function drawNodes(scene, m, route, ctx) {
    const layer = scene.querySelector('.node-layer');
    const { subscriptions, visibleKeys, broken, today, onOpen } = ctx;
    const chosenKeys = new Set(route.chosen.map(n => n.key));
    const C = palette();
    const resultOf = new Map(subscriptions.map(s => [eventKey(s), s.result]));
    const nextKey = route.chosen.find(n => n.event.date >= today && !resultOf.get(n.key))?.key;
    const isFirstDraw = prevChosen === null;
    layer.innerHTML = '';

    m.nodes.forEach(node => {
        const { event, key } = node;
        const state = getEventState(event, subscriptions);
        const color = getColorForSubject(event.subj);
        const visible = visibleKeys.has(key) || chosenKeys.has(key);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.key = key;
        btn.dataset.state = state;
        btn.title = `${event.subj}\n${formatShortDate(event.date)} · ${event.time} h · Div ${event.div}${state === 'locked' ? '\n🔒 Bloqueada por correlativa' : ''}`;
        btn.setAttribute('aria-label', `${event.subj}, ${formatShortDate(event.date)} ${event.time}, división ${event.div}${{ subscribed: ', elegida', passed: ', aprobada', failed: ', no aprobada' }[state] || ''}`);

        let scale = 0.86;
        let style = `background:${color};color:#fff;`;
        let cls = 'mt-node absolute rounded-full flex items-center justify-center font-bold leading-none border-2 border-white shadow-md transition-[transform,opacity] duration-300';
        let extra = '';

        if (isMine(state)) {
            scale = state === 'failed' ? 0.95 : 1.15;
            cls += ' z-20 ring-4 ring-white/70';
            if (key === nextKey) cls += ' node-next';
            if (!isFirstDraw && !prevChosen.has(key)) cls += ' node-pop';
            const short = `${event.date.slice(8).replace(/^0/, '')} ${MONTHS_SHORT[Number(event.date.slice(5, 7)) - 1]}`;
            const label = state === 'passed' ? `Aprobada · ${short}`
                : state === 'failed' ? `No aprobada · ${short}`
                : key === nextKey ? `${countdownLabel(event.date)} · ${event.time}`
                : `${short} · ${event.time}`;
            const flag = state === 'passed' ? '✅' : state === 'failed' ? '❌' : '🚩';
            if (state === 'failed') style += 'filter:grayscale(.7);opacity:.75;';
            extra += `<span class="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 whitespace-nowrap text-[10px] font-semibold bg-white ${state === 'failed' ? 'text-red-700' : state === 'passed' ? 'text-emerald-700' : 'text-gray-900'} rounded-full shadow px-2 py-0.5" style="transform:translateX(-50%) scale(${f1(1 / scale)})">${escapeHtml(label)}</span>`;
            extra += `<span class="absolute -top-3 -right-2 text-sm" aria-hidden="true">${flag}</span>`;
            if (broken.has(key)) extra += '<span class="absolute -bottom-2 -right-2 text-xs" aria-hidden="true">⚠️</span>';
        } else if (state === 'other') {
            style = `background:${C.otherBg};color:${color};border-color:${color};border-style:dashed;`;
            cls += ' opacity-80';
            scale = 0.78;
        } else if (state === 'locked') {
            style = `background:${C.lockedBg};color:${C.lockedFg};`;
            cls += ' opacity-70';
            extra += '<span class="absolute -top-2 -right-2 text-[10px]" aria-hidden="true">🔒</span>';
            scale = 0.78;
        } else {
            cls += ' opacity-90';
        }

        if (!visible) {
            cls += ' pointer-events-none';
            style += 'opacity:0.12;';
            btn.tabIndex = -1;
            btn.setAttribute('aria-hidden', 'true');
        }

        btn.className = cls;
        btn.style.cssText = `${style}left:${f1(node.x)}px;top:${f1(node.y)}px;width:${NODE}px;height:${NODE}px;font-size:${subjectAbbr(event.subj).length > 3 ? 9 : 11}px;transform:translate(-50%,-50%) scale(${scale});`;
        btn.innerHTML = `<span>${escapeHtml(subjectAbbr(event.subj))}</span>${extra}`;
        btn.addEventListener('click', () => onOpen(event));
        layer.appendChild(btn);
    });

    // Escalador
    const pos = climberPosition(scene.querySelector('.route-svg'), route);
    const climber = document.createElement('div');
    climber.className = 'climber absolute z-30 pointer-events-none text-center';
    climber.style.cssText = `left:${f1(pos.x)}px;top:${f1(pos.y)}px;`;
    climber.innerHTML = `
        <svg width="30" height="36" viewBox="0 0 28 34" class="block mx-auto drop-shadow" aria-hidden="true">
            <ellipse cx="14" cy="32.5" rx="8" ry="1.8" fill="#000" opacity=".2"/>
            <rect x="4.5" y="11" width="8" height="11" rx="2" fill="#92400e"/>
            <path d="M12 22 L9.5 31 M16.5 22 L19 31" stroke="#1f2937" stroke-width="3" stroke-linecap="round"/>
            <rect x="9" y="10" width="11" height="13" rx="3.5" fill="#dc2626"/>
            <path d="M19 13.5 L23.5 17" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>
            <line x1="24" y1="9" x2="24" y2="31.5" stroke="#78716c" stroke-width="1.6" stroke-linecap="round"/>
            <circle cx="15" cy="6.2" r="4.5" fill="#fcd9b6"/>
            <path d="M10.5 5.6 a4.5 4.5 0 0 1 9 0 z" fill="#2563eb"/>
            <circle cx="15" cy="1.2" r="1.5" fill="#2563eb"/>
        </svg>
        <span class="block text-[9px] font-bold text-white bg-gray-900/80 rounded-full px-1.5 mt-0.5">vos</span>`;
    layer.appendChild(climber);

    if (!route.chosen.length) {
        const base = m.items[0];
        const hint = document.createElement('div');
        hint.className = 'absolute -translate-x-1/2 z-30 text-xs font-semibold bg-gray-900 text-white rounded-xl shadow-lg px-3 py-2 text-center max-w-[80%]';
        hint.style.cssText = `left:${f1(base.cx)}px;top:${f1(base.top - 30)}px;`;
        hint.textContent = 'Elegí tu primera fecha para trazar la ruta ⛰️';
        layer.appendChild(hint);
    }

    prevChosen = chosenKeys;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/**
 * @param {HTMLElement} container - #mountain
 * @param {HTMLElement} hud - #mountain-hud
 * @param {{events: Array, subscriptions: Array, visible: Array, subjects: string[], today: string,
 *          onOpen: Function, onPendingClick: Function}} ctx
 */
export function renderMountain(container, hud, ctx) {
    const W = container.clientWidth;
    if (!W) return;
    const { events, subscriptions, visible, subjects, today, onOpen, onPendingClick } = ctx;

    let scene = container.querySelector('.mt-scene');
    let camps = container.querySelector('.mt-camps');
    if (!scene) {
        container.innerHTML = '';
        scene = document.createElement('div');
        scene.className = 'mt-scene relative w-full overflow-hidden';
        camps = document.createElement('div');
        camps.className = 'mt-camps';
        container.append(scene, camps);
    }

    const sig = `${W}|${events.length}|${events[0]?.date}|${events[events.length - 1]?.date}|${today}|${isDark()}`;
    if (sig !== staticSig) {
        map = layout(buildMap(events, today), W);
        buildStatic(scene, map);
        staticSig = sig;
        prevRouteD = null;
    }

    const route = buildRoute(subscriptions, map, today);
    const broken = findBrokenSubscriptions(subscriptions);
    drawRoute(scene, map, route, broken);
    drawNodes(scene, map, route, {
        subscriptions, broken, today, onOpen,
        visibleKeys: new Set(visible.map(eventKey))
    });

    // Campamentos "por elegir"
    const chosenSubjects = new Set(subscriptions.filter(isActive).map(s => s.subj));
    const passedCount = new Set(subscriptions.filter(s => s.result === 'passed').map(s => s.subj)).size;
    const pending = subjects.filter(s => !chosenSubjects.has(s));
    camps.innerHTML = `
        <div class="bg-gradient-to-b ${palette().camps} px-4 py-4 text-white">
            <p class="text-sm font-bold">${pending.length ? `⛺ Por elegir (${pending.length})` : '🎉 ¡Todas las materias tienen fecha!'}</p>
            ${pending.length ? '<p class="text-xs text-white/80 mb-3">Tocá un campamento para ver sus fechas en el calendario.</p>' : ''}
            <div class="flex flex-wrap gap-2">
                ${pending.map(s => `
                    <button type="button" data-subj="${escapeHtml(s)}" class="camp inline-flex items-center gap-1.5 text-left rounded-full bg-white/95 text-gray-900 text-xs font-medium px-3 py-1.5 shadow hover:bg-white active:scale-95 transition">
                        <span aria-hidden="true">⛺</span>
                        <span class="w-2 h-2 rounded-full" style="background:${getColorForSubject(s)}"></span>
                        ${escapeHtml(s)}
                    </button>`).join('')}
            </div>
        </div>`;
    camps.querySelectorAll('.camp').forEach(b => b.addEventListener('click', () => onPendingClick(b.dataset.subj)));

    // HUD
    const rests = map.items.filter(it => it.type === 'rest').length;
    const nextNode = route.chosen.find(n => n.event.date >= today && !subscriptions.find(s => eventKey(s) === n.key)?.result);
    const pct = subjects.length ? Math.round((chosenSubjects.size / subjects.length) * 100) : 0;
    const summitAlt = map.items[map.items.length - 1].altitude;
    hud.innerHTML = `
        <div class="bg-white/95 backdrop-blur rounded-2xl shadow-sm border border-gray-200 px-3 py-2 sm:px-4 sm:py-3">
            <div class="flex items-baseline justify-between gap-3 text-xs sm:text-sm">
                <span class="font-bold whitespace-nowrap">⛰️ ${chosenSubjects.size}/${subjects.length} materias en ruta</span>
                <span class="text-gray-600 truncate">${nextNode
                    ? `Próxima: <strong class="text-gray-900">${escapeHtml(subjectAbbr(nextNode.event.subj))}</strong> · ${countdownLabel(nextNode.event.date).toLowerCase()}`
                    : 'Sin paradas próximas'}</span>
            </div>
            <div class="h-1.5 sm:h-2 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-500" style="width:${pct}%"></div>
            </div>
            <div class="hidden sm:flex gap-4 text-xs text-gray-600 mt-1.5">
                <span>✅ <strong class="text-gray-900">${passedCount}</strong> aprobada${passedCount === 1 ? '' : 's'}</span>
                <span>🏠 <strong class="text-gray-900">${rests}</strong> refugios</span>
                <span>🏁 Cumbre a <strong class="text-gray-900">${summitAlt.toLocaleString('es-AR')}</strong> m</span>
                <span class="ml-auto">${pct}%</span>
            </div>
        </div>`;
}

export function scrollToClimber(container) {
    container.querySelector('.climber')?.scrollIntoView({ block: 'center' });
}
