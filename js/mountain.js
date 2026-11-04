// --- VISTA MONTAÑA ---
// Mapa fijo: cada fecha de examen es un lugar fijo de la montaña (abajo = noviembre, arriba = marzo).
// Capa estática: cielo, montaña, árboles, refugios, hitos de altura. Se arma una sola vez (o al cambiar el ancho).
// Capa dinámica: tu sendero (las fechas elegidas), senderos laterales, estados de cada fecha y el escalador.
import { getEventState, findBrokenSubscriptions } from './locks.js';
import {
    eventKey, byDateTime, daysBetween, parseIso, formatShortDate, formatMonth, MONTHS_SHORT,
    getColorForSubject, subjectAbbr, escapeHtml, countdownLabel
} from './utils.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ROW_H = 88;
const REST_H = 170;
const BASE_H = 150;
const SUMMIT_H = 190;
const REST_MIN_GAP = 5;     // más de 5 días sin exámenes → refugio
const BASE_ALT = 800;       // metros en el campamento base
const ALT_STEP = 100;       // metros por día de examen
const NODE = 34;            // diámetro de cada fecha

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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
    summit.peakY = summit.top + 34;
    summit.y = summit.top + 70;
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

    // Puntos del sendero elegido
    const points = [{ x: base.cx, y: base.y - 18, t: -Infinity, kind: 'base', itemIndex: 0 }];
    chosen.forEach(node => {
        const last = points[points.length - 1];
        withRests(last.itemIndex, node.itemIndex).forEach(({ it, i }) =>
            points.push({ x: it.trailX, y: it.y + 8, kind: 'rest', itemIndex: i }));
        points.push({ x: node.x, y: node.y, t: dayNum(node.event.date), kind: 'stop', key: node.key, itemIndex: node.itemIndex });
    });
    // Fechas para los refugios intermedios (para ubicar al escalador)
    points.forEach((p, i) => {
        if (p.kind !== 'rest') return;
        const prev = points.slice(0, i).reverse().find(q => q.kind !== 'rest');
        const next = points.slice(i + 1).find(q => q.kind !== 'rest');
        p.t = prev.t === -Infinity ? next.t - 0.5 : (prev.t + next.t) / 2;
    });

    // Lo que falta hasta la cumbre (punteado)
    const last = points[points.length - 1];
    const remaining = [{ x: last.x, y: last.y }];
    withRests(last.itemIndex, items.length - 1).forEach(({ it }) => remaining.push({ x: it.trailX, y: it.y + 8 }));
    remaining.push({ x: summit.cx, y: summit.peakY + 6 });

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

    return { points, remaining, chosen, climber };
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
    scene.innerHTML = '';
    scene.style.height = `${H}px`;

    const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'absolute inset-0', 'aria-hidden': 'true' });
    const defs = el('defs', {}, svg);
    defs.innerHTML = `
        <linearGradient id="mt-sky" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#7cb3f0"/><stop offset="0.55" stop-color="#cfe6fb"/><stop offset="1" stop-color="#eaf6ff"/>
        </linearGradient>
        <linearGradient id="mt-rock" x1="0" y1="${H}" x2="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#7fb565"/><stop offset="0.35" stop-color="#93a86d"/>
            <stop offset="0.6" stop-color="#a1917a"/><stop offset="1" stop-color="#8d8378"/>
        </linearGradient>
        <linearGradient id="mt-ridge" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#a5b4fc" stop-opacity="0.55"/><stop offset="1" stop-color="#c7d2fe" stop-opacity="0.25"/>
        </linearGradient>`;

    el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#mt-sky)' }, svg);
    el('circle', { cx: W * 0.84, cy: 70, r: 34, fill: '#fde68a', opacity: 0.9 }, svg);

    // Nubes
    for (let i = 0; i < 6; i++) {
        const g = el('g', { class: 'cloud', style: `animation-duration:${12 + i * 3}s;animation-delay:-${i * 2}s` }, svg);
        const cx = W * (0.1 + rand(i, 1) * 0.8);
        const cy = 40 + (H * 0.55) * (i / 6) + rand(i, 2) * 60;
        const s = 0.7 + rand(i, 3) * 0.6;
        [[0, 0, 26, 12], [-18, 4, 18, 9], [20, 5, 20, 9]].forEach(([dx, dy, rx, ry]) =>
            el('ellipse', { cx: cx + dx * s, cy: cy + dy * s, rx: rx * s, ry: ry * s, fill: '#ffffff', opacity: 0.8 }, g));
    }

    // Cordones de fondo
    el('path', { d: `M 0 ${H * 0.62} L ${W * 0.16} ${H * 0.30} L ${W * 0.34} ${H * 0.48} L ${W * 0.5} ${H * 0.40} L ${W * 0.5} ${H} L 0 ${H} Z`, fill: 'url(#mt-ridge)' }, svg);
    el('path', { d: `M ${W} ${H * 0.55} L ${W * 0.82} ${H * 0.24} L ${W * 0.64} ${H * 0.44} L ${W * 0.5} ${H * 0.36} L ${W * 0.5} ${H} L ${W} ${H} Z`, fill: 'url(#mt-ridge)' }, svg);

    // Montaña principal: borde que sigue el ancho de cada fila
    const summit = items[items.length - 1];
    const left = [];
    const right = [];
    items.slice(0, -1).forEach(it => {
        const hw = it.type === 'base' ? W / 2 : Math.min(W / 2 - 4, it.spread / 2 + 28);
        left.push({ x: it.cx - hw, y: it.y });
        right.push({ x: it.cx + hw, y: it.y });
    });
    const peak = { x: summit.cx, y: summit.peakY };
    const outline = [{ x: 0, y: H }, ...left, { x: summit.cx - 30, y: summit.peakY + 40 }, peak,
        { x: summit.cx + 30, y: summit.peakY + 40 }, ...right.reverse(), { x: W, y: H }];
    const mountainD = splinePath(outline) + ' Z';
    el('path', { d: mountainD, fill: 'url(#mt-rock)' }, svg);

    // Nieve en la punta (recortada con borde dentado)
    const snowLine = summit.bottom + ROW_H * 3;
    const jag = [];
    for (let x = W, k = 0; x > -14; x -= 14, k++) {
        jag.push(`${f1(Math.max(0, x))},${f1(snowLine + (k % 2 ? 10 : -6) + rand(k, 9) * 8)}`);
    }
    defs.insertAdjacentHTML('beforeend', `<clipPath id="mt-snow"><polygon points="0,0 ${W},0 ${jag.join(' ')}"/></clipPath>`);
    el('path', { d: mountainD, fill: '#f8fafc', 'clip-path': 'url(#mt-snow)' }, svg);

    // Árboles en las laderas bajas
    items.forEach((it, i) => {
        if (it.t > 0.55 || it.type === 'summit') return;
        [-1, 1].forEach((side, k) => {
            const reps = it.type === 'base' ? 3 : 1;
            for (let r = 0; r < reps; r++) {
                const x = it.cx + side * (it.spread / 2 + 6 + rand(i, k + r * 3) * (it.type === 'base' ? W * 0.12 : 16));
                const y = it.y + (rand(i, k + 5 + r) - 0.5) * 30;
                if (x < 8 || x > W - 8) continue;
                const s = 0.8 + rand(i, k + 7 + r) * 0.5;
                el('rect', { x: x - 1.5 * s, y: y + 6 * s, width: 3 * s, height: 6 * s, fill: '#5b3a1e' }, svg);
                el('polygon', { points: `${x},${y - 16 * s} ${x - 8 * s},${y + 7 * s} ${x + 8 * s},${y + 7 * s}`, fill: i % 3 ? '#2f6b3a' : '#3d7f47' }, svg);
            }
        });
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
            <rect x="8" y="-1" width="8" height="7" fill="#fde68a"/>`;
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
        el('path', { d, fill: 'none', stroke: '#ffffff', 'stroke-width': 13, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.55, class: 'route-fade' }, g);
        const main = el('path', { d, fill: 'none', stroke: '#b7793f', 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'main-trail' }, g);
        el('path', { d, fill: 'none', stroke: '#fef3c7', 'stroke-width': 2, 'stroke-dasharray': '5 9', 'stroke-linecap': 'round', class: 'route-fade' }, g);

        // Tramos cortados (correlativa sin cumplir)
        points.forEach((p, i) => {
            if (i === 0 || p.kind !== 'stop' || !broken.has(p.key)) return;
            let from = i - 1;
            while (from > 0 && points[from].kind === 'rest') from--;
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
    const nextKey = route.chosen.find(n => n.event.date >= today)?.key;
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
        btn.setAttribute('aria-label', `${event.subj}, ${formatShortDate(event.date)} ${event.time}, división ${event.div}${state === 'subscribed' ? ', elegida' : ''}`);

        let scale = 0.86;
        let style = `background:${color};color:#fff;`;
        let cls = 'mt-node absolute rounded-full flex items-center justify-center font-bold leading-none border-2 border-white shadow-md transition-[transform,opacity] duration-300';
        let extra = '';

        if (state === 'subscribed') {
            scale = 1.15;
            cls += ' z-20 ring-4 ring-white/70';
            if (key === nextKey) cls += ' node-next';
            if (!isFirstDraw && !prevChosen.has(key)) cls += ' node-pop';
            const past = event.date < today;
            const label = past ? `✓ ${formatShortDate(event.date)}`
                : key === nextKey ? `${countdownLabel(event.date)} · ${event.time}`
                : `${event.date.slice(8).replace(/^0/, '')} ${MONTHS_SHORT[Number(event.date.slice(5, 7)) - 1]} · ${event.time}`;
            extra += `<span class="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 whitespace-nowrap text-[10px] font-semibold bg-white text-gray-900 rounded-full shadow px-2 py-0.5" style="transform:translateX(-50%) scale(${f1(1 / scale)})">${escapeHtml(label)}</span>`;
            extra += `<span class="absolute -top-3 -right-2 text-sm" aria-hidden="true">${past ? '✅' : '🚩'}</span>`;
            if (broken.has(key)) extra += '<span class="absolute -bottom-2 -right-2 text-xs" aria-hidden="true">⚠️</span>';
        } else if (state === 'other') {
            style = `background:#fff;color:${color};border-color:${color};border-style:dashed;`;
            cls += ' opacity-80';
            scale = 0.78;
        } else if (state === 'locked') {
            style = 'background:#d6d3d1;color:#57534e;';
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

    const sig = `${W}|${events.length}|${events[0]?.date}|${events[events.length - 1]?.date}|${today}`;
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
    const chosenSubjects = new Set(subscriptions.map(s => s.subj));
    const pending = subjects.filter(s => !chosenSubjects.has(s));
    camps.innerHTML = `
        <div class="bg-gradient-to-b from-[#7fb565] to-[#5f9a4a] px-4 py-4 text-white">
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
    const nextNode = route.chosen.find(n => n.event.date >= today);
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
                <span>🏠 <strong class="text-gray-900">${rests}</strong> refugios</span>
                <span>🏁 Cumbre a <strong class="text-gray-900">${summitAlt.toLocaleString('es-AR')}</strong> m</span>
                <span class="ml-auto">${pct}%</span>
            </div>
        </div>`;
}

export function scrollToClimber(container) {
    container.querySelector('.climber')?.scrollIntoView({ block: 'center' });
}
