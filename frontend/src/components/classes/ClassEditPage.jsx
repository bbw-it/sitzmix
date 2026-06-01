import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/StoreProvider';
import { ToastContext } from '../../App';

const PASTEL_COLORS = [
  '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9',
  '#BAE1FF', '#E8BAFF', '#FFB3E6', '#B3FFE6',
  '#FFE6B3', '#B3D4FF', '#D4FFB3', '#FFB3B3',
];

export default function ClassEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useContext(ToastContext);
  const { getClass, createClass, updateClass, addStudent, bulkAddStudents, deleteStudent, addRule, deleteRule } = useStore();
  const isNew = !id;

  const [name, setName] = useState('Neue Klasse');
  const [students, setStudents] = useState([]);
  const [rules, setRules] = useState([]);
  const [activeTab, setActiveTab] = useState('students');
  const [newStudentName, setNewStudentName] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [ruleA, setRuleA] = useState('');
  const [ruleB, setRuleB] = useState('');
  const [classId, setClassId] = useState(id);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (id) loadClass();
    else loadedRef.current = true;
  }, [id]);

  // Warnung beim Verlassen mit ungespeicherten Änderungen
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const markDirty = () => { if (loadedRef.current) setIsDirty(true); };

  const loadClass = () => {
    const data = getClass(id);
    if (!data) { showToast('Fehler beim Laden', 'error'); return; }
    setName(data.name);
    setStudents(data.students || []);
    setRules(data.rules || []);
    setClassId(data.id);
    setIsDirty(false);
    loadedRef.current = true;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew && !classId) {
        const cls = await createClass({ name });
        setClassId(cls.id);
        setIsDirty(false);
        navigate(`/classes/${cls.id}`, { replace: true });
        showToast('Klasse erstellt');
      } else {
        await updateClass(classId, { name });
        setIsDirty(false);
        showToast('Gespeichert');
      }
    } catch {
      showToast('Fehler beim Speichern', 'error');
    }
    setSaving(false);
  };

  const handleAddStudent = async () => {
    if (!newStudentName.trim() || !classId) return;
    try {
      const s = await addStudent(classId, { name: newStudentName.trim() });
      setStudents(prev => [...prev, s]);
      setNewStudentName('');
    } catch {
      showToast('Fehler beim Hinzufügen', 'error');
    }
  };

  const bulkImport = async () => {
    if (!bulkText.trim() || !classId) return;
    try {
      const added = await bulkAddStudents(classId, bulkText);
      setStudents(prev => [...prev, ...added]);
      setBulkText('');
      showToast(`${added.length} Lernende hinzugefügt`);
    } catch {
      showToast('Fehler beim Import', 'error');
    }
  };

  const handleDeleteStudent = async (studentId) => {
    try {
      await deleteStudent(studentId);
      setStudents(s => s.filter(st => st.id !== studentId));
      setRules(r => r.filter(rule => rule.student_a_id !== studentId && rule.student_b_id !== studentId));
    } catch {
      showToast('Fehler beim Löschen', 'error');
    }
  };

  const handleAddRule = async () => {
    if (!ruleA || !ruleB || ruleA === ruleB || !classId) return;
    try {
      const rule = await addRule(classId, { studentAId: ruleA, studentBId: ruleB });
      setRules(r => [...r, rule]);
      setRuleA('');
      setRuleB('');
    } catch (err) {
      showToast(err.message || 'Fehler beim Hinzufügen', 'error');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      await deleteRule(ruleId);
      setRules(r => r.filter(rule => rule.id !== ruleId));
    } catch {
      showToast('Fehler beim Löschen', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Klasse bearbeiten</h1>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
              Nicht gespeichert
            </span>
          )}
          <button
            onClick={() => navigate('/classes')}
            className="bg-lime-100 hover:bg-lime-200 text-lime-800 font-medium py-2.5 px-5 rounded-lg text-sm transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`font-medium py-2.5 px-5 rounded-lg text-sm transition-colors disabled:opacity-50 ${
              isDirty
                ? 'bg-lime-600 hover:bg-lime-700 text-white'
                : 'bg-gray-900 hover:bg-gray-800 text-white'
            }`}
          >
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <label className="block text-sm font-bold text-gray-900 mb-2">Klassen-Bezeichnung</label>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); markDirty(); }}
          className="w-full max-w-lg border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
          placeholder="z.B. Klasse 3A"
        />
      </div>

      {classId && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-2.5 text-sm font-semibold uppercase tracking-wider transition-colors ${
                activeTab === 'students'
                  ? 'text-lime-600 border-b-2 border-lime-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Lernende ({students.length})
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-4 py-2.5 text-sm font-semibold uppercase tracking-wider transition-colors ${
                activeTab === 'rules'
                  ? 'text-lime-600 border-b-2 border-lime-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Regeln ({rules.length})
            </button>
          </div>

          {activeTab === 'students' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Student list */}
              <div className="lg:col-span-3">
                {students.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                    <p className="text-gray-400 italic">Keine Lernenden vorhanden.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                    {[...students].sort((a, b) => a.name.localeCompare(b.name, 'de')).map(s => (
                      <div key={s.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex-shrink-0"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="text-sm font-medium">{s.name}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteStudent(s.id)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add students */}
              <div className="lg:col-span-2">
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="font-bold mb-2">Lernende hinzufügen</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Füge einen oder mehrere Namen ein, getrennt durch Zeilenumbruch, Komma oder Semikolon.
                  </p>
                  <textarea
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    placeholder={'Max Mustermann\nErika Musterfrau\nHans Dampf'}
                    rows={5}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                  />
                  <button
                    onClick={bulkImport}
                    disabled={!bulkText.trim()}
                    className="mt-3 w-full bg-lime-500 hover:bg-lime-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-30"
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Rules list */}
              <div className="lg:col-span-3">
                <h3 className="font-bold mb-3">Aktive Regeln</h3>
                {rules.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                    <p className="text-gray-400 italic">Keine Regeln definiert.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                    {rules.map(r => (
                      <div key={r.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: r.studentA?.color }} />
                          <span className="font-medium">{r.studentA?.name}</span>
                          <span className="text-gray-400 mx-1">↔</span>
                          <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: r.studentB?.color }} />
                          <span className="font-medium">{r.studentB?.name}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteRule(r.id)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add rule */}
              <div className="lg:col-span-2">
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="font-bold mb-2">Regel hinzufügen</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Wähle zwei Lernende aus, die <strong>nicht nebeneinander</strong> sitzen sollen.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Schüler A</label>
                      <select
                        value={ruleA}
                        onChange={e => setRuleA(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                      >
                        <option value="">Bitte wählen...</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Schüler B</label>
                      <select
                        value={ruleB}
                        onChange={e => setRuleB(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                      >
                        <option value="">Bitte wählen...</option>
                        {students.filter(s => s.id !== ruleA).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleAddRule}
                      disabled={!ruleA || !ruleB || ruleA === ruleB}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-30"
                    >
                      Regel hinzufügen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
