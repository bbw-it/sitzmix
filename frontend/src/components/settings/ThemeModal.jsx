import { useState } from 'react';
import { THEMES, CUSTOM_THEME, FONT_OPTIONS, getTheme, setTheme, getCustomConfig, setCustomConfig, buildScale } from '../../lib/theme';
import Button from '../common/Button';

export default function ThemeModal({ onClose }) {
  const [current, setCurrent] = useState(getTheme());
  const [custom, setCustom] = useState(getCustomConfig());

  const choose = (id) => {
    setCurrent(setTheme(id));   // sofort live anwenden + speichern
  };

  const updateCustom = (patch) => {
    setCustom(setCustomConfig(patch));   // live anwenden, wenn „Eigenes" aktiv
  };

  const customScale = buildScale(custom.color);
  const swatchFor = (t) => (t.id === CUSTOM_THEME ? [customScale[400], customScale[600], customScale[800]] : t.swatch);
  const subtitleFor = (t) => (t.id === CUSTOM_THEME
    ? `${t.note} · ${FONT_OPTIONS.find(f => f.id === custom.font)?.label || ''}`
    : `${t.note} · ${t.font}`);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Erscheinungsbild</h2>
          <p className="text-sm text-gray-500 mt-0.5">Farb- und Schrift-Kombination wählen. Wird im Browser gespeichert.</p>
        </div>

        <div className="p-6 overflow-auto">
          <div className="grid grid-cols-2 gap-3">
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
                    {swatchFor(t).map((c, i) => (
                      <span key={i} className="w-6 h-6 rounded-full ring-1 ring-black/5" style={{ backgroundColor: c }} />
                    ))}
                    {active && (
                      <svg className="w-5 h-5 ml-auto text-lime-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 011.42-1.42l2.79 2.79 6.79-6.79a1 1 0 011.42 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="font-semibold text-gray-900">{t.label}</div>
                  <div className="text-xs text-gray-500">{subtitleFor(t)}</div>
                </button>
              );
            })}
          </div>

          {current === CUSTOM_THEME && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-900 mb-3">Eigenes Theme anpassen</p>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <span>Farbe</span>
                  <input
                    type="color"
                    value={custom.color}
                    onChange={e => updateCustom({ color: e.target.value })}
                    className="w-10 h-8 rounded border border-gray-300 cursor-pointer bg-white p-0.5"
                    title="Akzentfarbe wählen"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <span>Schrift</span>
                  <select
                    value={custom.font}
                    onChange={e => updateCustom({ font: e.target.value })}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                  >
                    {FONT_OPTIONS.map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>Fertig</Button>
        </div>
      </div>
    </div>
  );
}
