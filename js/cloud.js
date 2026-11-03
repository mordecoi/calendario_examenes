// --- SINCRONIZACIÓN CON GITHUB ---
// Las inscripciones viven en el archivo subscriptions.json de la rama "data"
// (no en main), así no se ensucia el historial ni se re-publica GitHub Pages.
// Leer no requiere token (repo público). Escribir requiere un token guardado
// en este dispositivo.

const OWNER = 'mordecoi';
const REPO = 'calendario_examenes';
const BRANCH = 'data';
const PATH = 'subscriptions.json';
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const CONFIG_KEY = 'cloud_sync_config';

let lastSha = null;
let branchChecked = false;

export function getToken() {
    try {
        const cfg = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null');
        return (cfg && typeof cfg.token === 'string') ? cfg.token.trim() : '';
    } catch {
        return '';
    }
}

export function setToken(token) {
    const t = (token || '').trim();
    if (t) localStorage.setItem(CONFIG_KEY, JSON.stringify({ token: t }));
    else localStorage.removeItem(CONFIG_KEY);
}

export function hasWriteAccess() {
    return !!getToken();
}

function headers(extra = {}) {
    const h = { Accept: 'application/vnd.github+json', ...extra };
    const token = getToken();
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
}

function decodeBase64Utf8(b64) {
    const bin = atob(b64.replace(/\n/g, ''));
    return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

function encodeBase64Utf8(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin);
}

/**
 * Lee las inscripciones de la nube.
 * @returns {Promise<{subscriptions: Array, missing: boolean}>}
 */
export async function fetchCloudSubscriptions() {
    const res = await fetch(`${API}/contents/${PATH}?ref=${BRANCH}`, {
        headers: headers(),
        cache: 'no-store'
    });
    if (res.status === 404) {
        lastSha = null;
        return { subscriptions: [], missing: true };
    }
    if (!res.ok) throw new Error(`GitHub respondió ${res.status}`);
    const json = await res.json();
    lastSha = json.sha;
    const data = JSON.parse(decodeBase64Utf8(json.content));
    if (!data || !Array.isArray(data.subscriptions)) {
        throw new Error('Formato inválido en subscriptions.json');
    }
    return { subscriptions: data.subscriptions, missing: false };
}

async function refreshSha() {
    const res = await fetch(`${API}/contents/${PATH}?ref=${BRANCH}`, { headers: headers(), cache: 'no-store' });
    lastSha = res.ok ? (await res.json()).sha : null;
}

/** Crea la rama "data" a partir de main si todavía no existe */
async function ensureBranch() {
    if (branchChecked) return;
    const res = await fetch(`${API}/git/ref/heads/${BRANCH}`, { headers: headers(), cache: 'no-store' });
    if (res.status === 404) {
        const mainRes = await fetch(`${API}/git/ref/heads/main`, { headers: headers(), cache: 'no-store' });
        if (!mainRes.ok) throw new Error(`No se pudo leer main (${mainRes.status})`);
        const mainSha = (await mainRes.json()).object.sha;
        const create = await fetch(`${API}/git/refs`, {
            method: 'POST',
            headers: headers({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: mainSha })
        });
        if (!create.ok && create.status !== 422) {
            throw new Error(`No se pudo crear la rama ${BRANCH} (${create.status})`);
        }
        lastSha = null;
    } else if (!res.ok) {
        throw new Error(`GitHub respondió ${res.status}`);
    }
    branchChecked = true;
}

function put(subscriptions, sha) {
    const body = {
        message: 'chore(subscriptions): update',
        content: encodeBase64Utf8(JSON.stringify({
            version: 2,
            updatedAt: new Date().toISOString(),
            subscriptions
        }, null, 2)),
        branch: BRANCH
    };
    if (sha) body.sha = sha;
    return fetch(`${API}/contents/${PATH}`, {
        method: 'PUT',
        headers: headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body)
    });
}

/** Guarda las inscripciones en la nube (el último en guardar gana) */
export async function saveCloudSubscriptions(subscriptions) {
    if (!hasWriteAccess()) throw new Error('Falta el token de GitHub');
    await ensureBranch();

    let res = await put(subscriptions, lastSha);
    if (res.status === 409 || res.status === 422) {
        // El sha cambió (otro dispositivo guardó): tomar el nuevo y reintentar
        await refreshSha();
        res = await put(subscriptions, lastSha);
    }
    if (res.status === 401 || res.status === 403) {
        throw new Error('Token inválido o sin permiso de escritura');
    }
    if (!res.ok) throw new Error(`GitHub respondió ${res.status}`);
    lastSha = (await res.json()).content.sha;
}
