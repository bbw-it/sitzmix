import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/StoreProvider';
import { ToastContext } from '../../App';
import Button from '../common/Button';

export default function ClassListPage() {
  const { listClasses, createClass, deleteClass } = useStore();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const showToast = useContext(ToastContext);

  useEffect(() => {
    setClasses(listClasses());
    setLoading(false);
  }, []);

  const handleCreate = async () => {
    try {
      const cls = await createClass({ name: 'Neue Klasse' });
      navigate(`/classes/${cls.id}`);
    } catch {
      showToast('Fehler beim Erstellen', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}" wirklich löschen? Alle Lernenden und Regeln werden ebenfalls gelöscht.`)) return;
    try {
      await deleteClass(id);
      setClasses(listClasses());
      showToast('Klasse gelöscht');
    } catch {
      showToast('Fehler beim Löschen', 'error');
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Laden...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Klassen verwalten</h1>
        <Button variant="secondary" onClick={handleCreate}>
          + Neue Klasse
        </Button>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">Noch keine Klassen vorhanden.</p>
          <p className="text-gray-400 text-sm mt-2">Erstelle eine neue Klasse, um zu beginnen.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map(cls => (
            <div key={cls.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{cls.name}</h3>
                <p className="text-sm mt-0.5">
                  <span className="text-lime-600 font-semibold">{cls.studentCount}</span>
                  <span className="text-gray-500"> Lernende</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate(`/classes/${cls.id}`)}>
                  Bearbeiten
                </Button>
                <Button variant="danger-outline" size="sm" onClick={() => handleDelete(cls.id, cls.name)}>
                  Löschen
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
