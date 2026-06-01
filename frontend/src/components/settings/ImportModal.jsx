import { useState, useRef } from 'react';
import { useStore } from '../../store/StoreProvider';
import { validateImport, applyImport } from '../../lib/exportImport';

export default function ImportModal({ onClose }) {
  const { refresh } = useStore();
  const [step, setStep] = useState('select'); // select | preview | importing | done
  const [fileData, setFileData] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const err = validateImport(data);
        if (err) { setError(err); return; }
        setFileData(data);
        setStep('preview');
      } catch {
        setError('Datei konnte nicht gelesen werden. Ist es eine gültige JSON-Datei?');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setStep('importing');
    try {
      const imported = await applyImport(fileData);
      setResult(imported);
      refresh();
      setStep('done');
    } catch (err) {
      setError(err.message || 'Import fehlgeschlagen.');
      setStep('preview');
    }
  };

  const classCount = fileData?.classes?.length || 0;
  const studentCount = fileData?.classes?.reduce((sum, c) => sum + (c.students?.length || 0), 0) || 0;
  const ruleCount = fileData?.classes?.reduce((sum, c) => sum + (c.rules?.length || 0), 0) || 0;
  const roomCount = fileData?.rooms?.length || 0;
  const seatCount = fileData?.rooms?.reduce((sum, r) => sum + (r.seats?.length || 0), 0) || 0;
  const areaCount = fileData?.rooms?.reduce((sum, r) => sum + (r.areas?.length || 0), 0) || 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Daten importieren</h2>
        </div>

        <div className="px-6 py-5">
          {/* Step: select file */}
          {step === 'select' && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Wähle eine SitzMix-Export-Datei (.json) aus.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-lime-400 hover:text-lime-700 hover:bg-lime-50 transition-colors text-sm font-medium"
                onClick={() => fileRef.current?.click()}
              >
                <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Datei auswählen
              </button>
              {error && (
                <p className="mt-3 text-sm text-red-600">{error}</p>
              )}
            </div>
          )}

          {/* Step: preview */}
          {step === 'preview' && (
            <div>
              <p className="text-sm text-gray-600 mb-4">Folgende Daten wurden erkannt:</p>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                {classCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-lime-500" />
                    <span className="font-medium">{classCount} {classCount === 1 ? 'Klasse' : 'Klassen'}</span>
                    <span className="text-gray-400">({studentCount} Lernende, {ruleCount} Regeln)</span>
                  </div>
                )}
                {roomCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="font-medium">{roomCount} {roomCount === 1 ? 'Zimmer' : 'Zimmer'}</span>
                    <span className="text-gray-400">({seatCount} Plätze, {areaCount} Bereiche)</span>
                  </div>
                )}
                {classCount === 0 && roomCount === 0 && (
                  <p className="text-gray-400">Keine Daten in der Datei gefunden.</p>
                )}
              </div>

              {error && (
                <p className="mt-3 text-sm text-red-600">{error}</p>
              )}

              <p className="mt-4 text-sm text-gray-500">
                Bei Namenskonflikten wird automatisch " (Import)" angehängt.
              </p>
            </div>
          )}

          {/* Step: importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center py-6">
              <svg className="animate-spin h-8 w-8 text-lime-600 mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-gray-600">Importiere Daten...</p>
            </div>
          )}

          {/* Step: done */}
          {step === 'done' && result && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold text-gray-900">Import erfolgreich!</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm text-gray-700">
                {result.classes > 0 && <p>{result.classes} {result.classes === 1 ? 'Klasse' : 'Klassen'} mit {result.students} Lernenden und {result.rules} Regeln</p>}
                {result.rooms > 0 && <p>{result.rooms} {result.rooms === 1 ? 'Zimmer' : 'Zimmer'} mit {result.seats} Plätzen und {result.areas} Bereichen</p>}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          {step === 'select' && (
            <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800" onClick={onClose}>
              Abbrechen
            </button>
          )}
          {step === 'preview' && (
            <>
              <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800" onClick={onClose}>
                Abbrechen
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-lime-600 hover:bg-lime-700 rounded-lg transition-colors disabled:opacity-50"
                disabled={classCount === 0 && roomCount === 0}
                onClick={handleImport}
              >
                Importieren
              </button>
            </>
          )}
          {step === 'done' && (
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-lime-600 hover:bg-lime-700 rounded-lg transition-colors"
              onClick={onClose}
            >
              Schliessen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
