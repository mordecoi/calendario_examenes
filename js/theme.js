// --- MODO OSCURO ---
// Por defecto sigue al sistema; el botón ☀️/🌙 fija una preferencia en este dispositivo.
// (La clase "dark" ya se aplica en <head> antes de pintar, para evitar un destello claro.)
const THEME_KEY = 'theme';
const system = window.matchMedia('(prefers-color-scheme: dark)');

function saved() {
    try { return localStorage.getItem(THEME_KEY); } catch { return null; }
}

export function isDark() {
    return document.documentElement.classList.contains('dark');
}

function apply(dark) {
    document.documentElement.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#171a21' : '#ffffff');
    const btn = document.getElementById('theme-button');
    if (btn) {
        btn.textContent = dark ? '☀️' : '🌙';
        btn.title = dark ? 'Modo claro' : 'Modo oscuro';
        btn.setAttribute('aria-label', btn.title);
    }
}

/** @param {Function} onChange - se llama cuando cambia el tema */
export function initTheme(onChange) {
    const pref = saved();
    apply(pref ? pref === 'dark' : system.matches);

    system.addEventListener('change', e => {
        if (saved()) return; // el usuario eligió uno a mano
        apply(e.matches);
        onChange();
    });

    document.getElementById('theme-button')?.addEventListener('click', () => {
        const dark = !isDark();
        try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch { /* sin storage */ }
        apply(dark);
        onChange();
    });
}
