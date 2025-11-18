// Cloud sync using GitHub Raw (read) + Contents API (write)
// Stores config in localStorage under key 'cloud_sync_config'

const CONFIG_KEY = 'cloud_sync_config';

export function getCloudConfig() {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isCloudConfigured() {
  const cfg = getCloudConfig();
  return !!(cfg && cfg.owner && cfg.repo && cfg.branch && cfg.path);
}

export function configureCloudInteractive(defaults = {}) {
  // Minimal prompts to avoid adding UI chrome
  const owner = prompt('GitHub owner/usuario:', defaults.owner || 'mordecoi');
  if (!owner) return false;
  const repo = prompt('Repositorio:', defaults.repo || 'calendario_examenes');
  if (!repo) return false;
  const branch = prompt('Branch:', defaults.branch || 'main');
  if (!branch) return false;
  const path = prompt('Ruta del archivo (JSON):', defaults.path || 'data/subscriptions.json');
  if (!path) return false;
  const token = prompt('GitHub Personal Access Token (solo repo:contents). Déjalo vacío para solo lectura:', defaults.token || '');

  const cfg = { owner, repo, branch, path, token: token?.trim() || '' };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  alert('Configuración de sincronización guardada.');
  return true;
}

function buildRawUrl(cfg) {
  return `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/${cfg.path}`;
}

function buildContentsApiUrl(cfg) {
  return `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`;
}

export async function fetchCloudSubscriptions() {
  const cfg = getCloudConfig();
  if (!cfg) throw new Error('Cloud no configurado');
  const res = await fetch(buildRawUrl(cfg), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`No se pudo leer el JSON remoto (${res.status})`);
  const json = await res.json();
  if (!json || !Array.isArray(json.subscriptions)) {
    throw new Error('Formato inválido en subscriptions.json');
  }
  return json;
}

async function getRemoteSha(cfg) {
  const headers = cfg.token ? { Authorization: `token ${cfg.token}` } : {};
  const res = await fetch(buildContentsApiUrl(cfg), { headers });
  if (!res.ok) throw new Error(`No se pudo obtener SHA remoto (${res.status})`);
  const json = await res.json();
  return json.sha;
}

export async function saveCloudSubscriptions(subscriptions) {
  const cfg = getCloudConfig();
  if (!cfg) throw new Error('Cloud no configurado');
  if (!cfg.token) throw new Error('Se requiere token para guardar en GitHub');

  const contentObj = {
    version: 1,
    updatedAt: new Date().toISOString(),
    subscriptions
  };
  const contentStr = JSON.stringify(contentObj, null, 2);
  const contentB64 = btoa(unescape(encodeURIComponent(contentStr)));

  const sha = await getRemoteSha(cfg).catch(() => undefined); // si no existe, será un create

  const body = {
    message: 'chore(subscriptions): update cloud subscriptions',
    content: contentB64,
    branch: cfg.branch,
    sha
  };

  const res = await fetch(buildContentsApiUrl(cfg), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `token ${cfg.token}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error al guardar en GitHub: ${res.status} ${text}`);
  }

  return true;
}
