// Zentrales Button-System — eine Quelle der Wahrheit für die Button-Hierarchie.
//
//  primary         grün   – die Bestätigungs-/Auslöse-Aktion (Generieren, Speichern, …)
//  secondary       schwarz – wichtige Erstell-/Zusatzaktion (+ Neue Klasse, Als PNG, …)
//  outline         neutral – Werkzeuge & Listen-Aktionen (Bearbeiten, Bild wählen, …)
//  ghost           leise   – Abbrechen, Schliessen, Links
//  danger          rot     – inline Löschen/Entfernen
//  danger-outline  rot     – Löschen in Listen

const BASE =
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg text-sm ' +
  'transition-colors disabled:opacity-40 disabled:cursor-not-allowed ' +
  'focus:outline-none focus:ring-2 focus:ring-offset-1';

const SIZES = {
  sm: 'px-3 py-2',
  md: 'px-4 py-2.5',
};

const VARIANTS = {
  primary: 'bg-lime-600 hover:bg-lime-700 text-white focus:ring-lime-500',
  secondary: 'bg-gray-900 hover:bg-gray-800 text-white focus:ring-gray-400',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-300',
  danger: 'text-red-600 hover:bg-red-50 focus:ring-red-300',
  'danger-outline': 'border border-red-200 text-red-600 hover:bg-red-50 focus:ring-red-300',
};

export function buttonClasses({ variant = 'primary', size = 'md', className = '' } = {}) {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant] || VARIANTS.primary} ${className}`.trim();
}

export default function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}
