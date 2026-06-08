import { useState, useEffect } from 'react';
import { isExportPending, acknowledgeExport, subscribe } from '../../lib/store';

export default function PrivacyBanner() {
  const [visible, setVisible] = useState(() => isExportPending());

  // Erscheint nach jeder Datenänderung wieder (Store benachrichtigt)
  useEffect(() => subscribe(() => setVisible(isExportPending())), []);

  if (!visible) return null;

  const close = () => {
    acknowledgeExport();
    setVisible(false);
  };

  return (
    <div className="bg-lime-50 border-b border-lime-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-start gap-2 text-xs text-lime-900">
        <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="flex-1">
          Alle Daten bleiben ausschliesslich in diesem Browser — Erstelle regelmässig über
          {' '}<strong>Einstellungen → Daten exportieren</strong> eine Sicherungskopie,
          damit beim Leeren des Browser-Speichers nichts verloren geht.
        </span>
        <button onClick={close} className="flex-shrink-0 text-lime-700 hover:text-lime-900" title="Hinweis ausblenden">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
