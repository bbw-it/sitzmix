import { useState, useEffect } from 'react';
import { isExportPending, acknowledgeExport, subscribe } from '../../lib/store';

export default function PrivacyBanner({ onExport }) {
  const [visible, setVisible] = useState(() => isExportPending());

  // Erscheint nach jeder Datenänderung wieder (Store benachrichtigt)
  useEffect(() => subscribe(() => setVisible(isExportPending())), []);

  if (!visible) return null;

  const close = () => {
    acknowledgeExport();
    setVisible(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="px-4 py-3 rounded-xl bg-amber-100 border border-amber-200 flex items-start gap-2.5 text-xs leading-relaxed text-amber-900">
        <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="flex-1">
          Deine Daten sind nur in diesem Browser gespeichert. Sichere sie regelmässig über
          {' '}<button
            type="button"
            onClick={onExport}
            className="font-semibold underline underline-offset-2 decoration-amber-400 hover:decoration-amber-900"
          >
            Einstellungen → Daten exportieren
          </button>.
        </span>
        <button onClick={close} className="flex-shrink-0 text-amber-700 hover:text-amber-900" title="Hinweis ausblenden">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
