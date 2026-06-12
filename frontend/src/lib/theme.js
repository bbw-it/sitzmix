// Theme-Auswahl: Farb-/Font-Kombinationen, benannt nach Schweizer Städten.
// Die eigentlichen Farben/Fonts liegen in index.css unter [data-theme="…"];
// hier stehen nur Metadaten für die Auswahl (Vorschau-Swatches, Beschriftung).

const KEY = 'sitzmix-theme';
export const DEFAULT_THEME = 'winterthur';

export const THEMES = [
  { id: 'winterthur', label: 'Winterthur', note: 'Standard', font: 'Sans-Serif',   swatch: ['#95C11E', '#6e9a10', '#445d14'] },
  { id: 'zuerich',    label: 'Zürich',     note: 'Blau',     font: 'Helvetica',     swatch: ['#3b82f6', '#2563eb', '#1e40af'] },
  { id: 'bern',       label: 'Bern',       note: 'Rot',      font: 'Serif',         swatch: ['#ef4444', '#dc2626', '#991b1b'] },
  { id: 'genf',       label: 'Genève',     note: 'Petrol',   font: 'Serif',         swatch: ['#14b8a6', '#0d9488', '#115e59'] },
  { id: 'lugano',     label: 'Lugano',     note: 'Terracotta', font: 'Rounded',     swatch: ['#f97316', '#ea580c', '#9a3412'] },
];

export function isValidTheme(id) {
  return THEMES.some(t => t.id === id);
}

// In-Memory ist die Wahrheit; localStorage dient nur der Persistenz über Reloads.
let current = DEFAULT_THEME;
try {
  const stored = localStorage.getItem(KEY);
  if (isValidTheme(stored)) current = stored;
} catch { /* ignore (z.B. jsdom opaque origin) */ }

export function getTheme() {
  return current;
}

// Theme nur anwenden (DOM), ohne zu speichern – z.B. beim App-Start.
export function applyTheme(id) {
  const t = isValidTheme(id) ? id : DEFAULT_THEME;
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = t;
}

// Theme wählen: merken (In-Memory + localStorage) + anwenden.
export function setTheme(id) {
  current = isValidTheme(id) ? id : DEFAULT_THEME;
  try { localStorage.setItem(KEY, current); } catch { /* ignore */ }
  applyTheme(current);
  return current;
}

// Nur für Tests: In-Memory-Zustand zurücksetzen.
export function _resetTheme() {
  current = DEFAULT_THEME;
}
