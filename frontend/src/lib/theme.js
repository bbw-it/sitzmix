// Theme-Auswahl: Farb-/Font-Kombinationen, benannt nach Schweizer Städten,
// plus ein frei konfigurierbares Theme „Eigenes".
// Die festen Farben/Fonts liegen in index.css unter [data-theme="…"];
// das eigene Theme setzt seine Variablen inline auf <html> (überschreibt alles).

const KEY = 'sitzmix-theme';
const CUSTOM_KEY = 'sitzmix-theme-custom';
export const DEFAULT_THEME = 'winterthur';
export const CUSTOM_THEME = 'custom';

export const FONT_OPTIONS = [
  { id: 'sans',      label: 'Sans-Serif', stack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  { id: 'helvetica', label: 'Helvetica',  stack: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { id: 'serif',     label: 'Serif',      stack: "Georgia, Cambria, 'Times New Roman', serif" },
  { id: 'rounded',   label: 'Rounded',    stack: "ui-rounded, 'SF Pro Rounded', 'Segoe UI', system-ui, sans-serif" },
  { id: 'mono',      label: 'Monospace',  stack: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace" },
];

const DEFAULT_CUSTOM = { color: '#7c3aed', font: 'sans' };

export const THEMES = [
  { id: 'winterthur', label: 'Winterthur', note: 'Standard',      font: 'Sans-Serif', swatch: ['#95C11E', '#6e9a10', '#445d14'] },
  { id: 'zuerich',    label: 'Zürich',     note: 'Blau',          font: 'Helvetica',  swatch: ['#3b82f6', '#2563eb', '#1e40af'] },
  { id: 'bern',       label: 'Bern',       note: 'Rot',           font: 'Serif',      swatch: ['#ef4444', '#dc2626', '#991b1b'] },
  { id: 'genf',       label: 'Genève',     note: 'Petrol',        font: 'Serif',      swatch: ['#14b8a6', '#0d9488', '#115e59'] },
  { id: 'lugano',     label: 'Lugano',     note: 'Terracotta',    font: 'Rounded',    swatch: ['#f97316', '#ea580c', '#9a3412'] },
  { id: CUSTOM_THEME, label: 'Eigenes',    note: 'Konfigurierbar', font: null,        swatch: null },
];

export function isValidTheme(id) {
  return THEMES.some(t => t.id === id);
}

// ── Farbskala aus einer Basisfarbe ─────────────────────────
function hexToHsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function hslToHex(h, s, l) {
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const SCALE_L = { 50: 0.96, 100: 0.91, 200: 0.83, 300: 0.72, 400: 0.60, 500: 0.50, 700: 0.35, 800: 0.29, 900: 0.24, 950: 0.14 };
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// Erzeugt eine Tailwind-artige Skala: die gewählte Farbe ist exakt Stufe 600
// (der Haupt-Akzent, z.B. Buttons), die übrigen Stufen teilen Hue/Sättigung.
export function buildScale(hex) {
  const hsl = hexToHsl(hex) || hexToHsl(DEFAULT_CUSTOM.color);
  const out = {};
  for (const step of STEPS) {
    out[step] = step === 600 ? hslToHex(hsl.h, hsl.s, hsl.l) : hslToHex(hsl.h, hsl.s, SCALE_L[step]);
  }
  return out;
}

export function isValidHex(c) { return typeof c === 'string' && /^#?[0-9a-f]{6}$/i.test(c.trim()); }
function sanitizeCustom(cfg) {
  return {
    color: isValidHex(cfg?.color) ? (cfg.color.startsWith('#') ? cfg.color : `#${cfg.color}`).toLowerCase() : DEFAULT_CUSTOM.color,
    font: FONT_OPTIONS.some(f => f.id === cfg?.font) ? cfg.font : DEFAULT_CUSTOM.font,
  };
}

// ── Zustand (In-Memory ist die Wahrheit; localStorage nur Persistenz) ──
let current = DEFAULT_THEME;
let customCfg = { ...DEFAULT_CUSTOM };
try {
  const stored = localStorage.getItem(KEY);
  if (isValidTheme(stored)) current = stored;
  const storedCfg = localStorage.getItem(CUSTOM_KEY);
  if (storedCfg) customCfg = sanitizeCustom(JSON.parse(storedCfg));
} catch { /* ignore (z.B. jsdom opaque origin) */ }

export function getTheme() { return current; }
export function getCustomConfig() { return { ...customCfg }; }

// Theme nur anwenden (DOM), ohne zu speichern – z.B. beim App-Start.
export function applyTheme(id) {
  const t = isValidTheme(id) ? id : DEFAULT_THEME;
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = t;
  if (t === CUSTOM_THEME) {
    const scale = buildScale(customCfg.color);
    for (const step of STEPS) root.style.setProperty(`--color-lime-${step}`, scale[step]);
    const font = FONT_OPTIONS.find(f => f.id === customCfg.font) || FONT_OPTIONS[0];
    root.style.setProperty('--app-font', font.stack);
  } else {
    for (const step of STEPS) root.style.removeProperty(`--color-lime-${step}`);
    root.style.removeProperty('--app-font');
  }
}

// Theme wählen: merken (In-Memory + localStorage) + anwenden.
export function setTheme(id) {
  current = isValidTheme(id) ? id : DEFAULT_THEME;
  try { localStorage.setItem(KEY, current); } catch { /* ignore */ }
  applyTheme(current);
  return current;
}

// Konfiguration des eigenen Themes ändern (Farbe/Font); wendet live an, wenn aktiv.
export function setCustomConfig(cfg) {
  customCfg = sanitizeCustom({ ...customCfg, ...cfg });
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(customCfg)); } catch { /* ignore */ }
  if (current === CUSTOM_THEME) applyTheme(CUSTOM_THEME);
  return { ...customCfg };
}

// Nur für Tests: In-Memory-Zustand zurücksetzen.
export function _resetTheme() {
  current = DEFAULT_THEME;
  customCfg = { ...DEFAULT_CUSTOM };
}
