import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/StoreProvider';
import { ToastContext } from '../../App';

export default function RoomListPage() {
  const { listRooms, createRoom, deleteRoom } = useStore();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const showToast = useContext(ToastContext);

  useEffect(() => {
    setRooms(listRooms());
    setLoading(false);
  }, []);

  const handleCreate = async () => {
    try {
      const room = await createRoom({ name: 'Neues Zimmer' });
      navigate(`/rooms/${room.id}`);
    } catch {
      showToast('Fehler beim Erstellen', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}" wirklich löschen?`)) return;
    try {
      await deleteRoom(id);
      setRooms(listRooms());
      showToast('Zimmer gelöscht');
    } catch {
      showToast('Fehler beim Löschen', 'error');
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Laden...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Zimmer verwalten</h1>
        <button
          onClick={handleCreate}
          className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 px-5 rounded-lg text-sm transition-colors"
        >
          + Neues Zimmer
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">Noch keine Zimmer vorhanden.</p>
          <p className="text-gray-400 text-sm mt-2">Erstelle ein neues Zimmer mit einem Grundriss.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rooms.map(room => (
            <div key={room.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{room.name}</h3>
                <p className="text-sm mt-0.5">
                  <span className="text-lime-600 font-semibold">{room.seatCount}</span>
                  <span className="text-gray-500"> Plätze</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/rooms/${room.id}`)}
                  className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                >
                  Bearbeiten
                </button>
                <button
                  onClick={() => handleDelete(room.id, room.name)}
                  className="border border-red-200 hover:bg-red-50 text-red-500 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
