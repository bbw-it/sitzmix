import { useState } from 'react';
import { THEMES, getTheme, setTheme } from '../../lib/theme';
import Button from '../common/Button';

export default function ThemeModal({ onClose }) {
  const [current, setCurrent] = useState(getTheme());

  const choose = (id) => {
    setCurrent(setTheme(id));   // sofort live anwenden + speichern
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Erscheinungsbild</h2>
          <p className="text-sm text-gray-500 mt-0.5">Farb- und Schrift-Kombination wählen. Wird im Browser gespeichert.</p>
        </div>

        <div className="p-6 overflow-auto grid grid-cols-2 gap-3">
          {THEMES.map(t => {
            const active = t.id === current;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => choose(t.id)}
                aria-pressed={active}
                className={`text-left rounded-xl border-2 p-3 transition-all ${
                  active ? 'border-lime-500 bg-lime-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  {t.swatch.map((c, i) => (
                    <span key={i} className="w-6 h-6 rounded-full ring-1 ring-black/5" style={{ backgroundColor: c }} />
                  ))}
                  {active && (
                    <svg className="w-5 h-5 ml-auto text-lime-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 011.42-1.42l2.79 2.79 6.79-6.79a1 1 0 011.42 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="font-semibold text-gray-900">{t.label}</div>
                <div className="text-xs text-gray-500">{t.note} · {t.font}</div>
              </button>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>Fertig</Button>
        </div>
      </div>
    </div>
  );
}
