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

export function hasWriteAccess() {
  const cfg = getCloudConfig();
  return !!(cfg && cfg.token && cfg.token.trim());
}

export function configureCloudInteractive(defaults = {}) {
  // Pre-configurado para este proyecto, solo pedir el token
  const owner = 'mordecoi';
  const repo = 'calendario_examenes';
  const branch = 'main';
  const path = 'data/subscriptions.json';
  
  const token = prompt(
    'GitHub Personal Access Token (PAT):\n\n' +
    'Necesitas permisos: repo > contents (write)\n' +
    'Crear en: github.com → Settings → Developer settings → Personal access tokens\n\n' +
    'Déjalo VACÍO para modo SOLO LECTURA (sin sincronización):',
    defaults.token || ''
  );
  
  // null = usuario canceló (ESC), string vacía = modo solo lectura
  if (token === null) {
    return false; // Usuario canceló con ESC
  }

  const cfg = { owner, repo, branch, path, token: token.trim() };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  
  if (!token.trim()) {
    alert('📖 Modo solo lectura activado. Puedes ver inscripciones pero no sincronizar a la nube.');
  } else {
    alert('✅ Token guardado. Ahora puedes sincronizar tus inscripciones en la nube.');
  }
  
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
  const res = await fetch(buildContentsApiUrl(cfg) + `?ref=${cfg.branch}`, { headers });
  if (!res.ok) {
    if (res.status === 404) return null; // Archivo no existe aún
    throw new Error(`No se pudo obtener SHA remoto (${res.status})`);
  }
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

  // Obtener SHA actual (si existe)
  const sha = await getRemoteSha(cfg);

  const body = {
    message: 'chore(subscriptions): update cloud subscriptions',
    content: contentB64,
    branch: cfg.branch
  };
  
  // Solo incluir sha si el archivo ya existe
  if (sha) {
    body.sha = sha;
  }

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
