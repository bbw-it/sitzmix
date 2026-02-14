import { useState, useEffect } from 'react';
import api from '../../api/client';

export default function SettingsModal({ onClose }) {
  const [settings, setSettings] = useState({
    db_host: '127.0.0.1',
    db_port: '3307',
    db_user: 'user1',
    db_password: 'user123',
    db_name: 'sitzmix',
  });
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings').then(res => {
      setSettings(prev => ({ ...prev, ...res.data }));
    }).catch(() => {});
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/settings/test-connection', {
        host: settings.db_host,
        port: settings.db_port,
        user: settings.db_user,
        password: settings.db_password,
        database: settings.db_name,
      });
      setTestResult(res.data);
    } catch {
      setTestResult({ success: false, message: 'Verbindungstest fehlgeschlagen' });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', { settings });
    } catch {}
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Einstellungen</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Datenbankverbindung</h3>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
              <input
                type="text"
                value={settings.db_host}
                onChange={e => setSettings(s => ({ ...s, db_host: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
              <input
                type="text"
                value={settings.db_port}
                onChange={e => setSettings(s => ({ ...s, db_port: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Benutzer</label>
            <input
              type="text"
              value={settings.db_user}
              onChange={e => setSettings(s => ({ ...s, db_user: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
            <input
              type="password"
              value={settings.db_password}
              onChange={e => setSettings(s => ({ ...s, db_password: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datenbank</label>
            <input
              type="text"
              value={settings.db_name}
              onChange={e => setSettings(s => ({ ...s, db_name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
            />
          </div>
        </div>

        {testResult && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {testResult.success ? '✓ ' : '✗ '}{testResult.message}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {testing ? 'Teste...' : 'Verbindung testen'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Speichere...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}
