import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { ToastContext } from '../../App';
import SeatPlacer from './SeatPlacer';

export default function RoomEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useContext(ToastContext);
  const isNew = !id;

  const [name, setName] = useState('Neues Zimmer');
  const [room, setRoom] = useState(null);
  const [seats, setSeats] = useState([]);
  const [roomId, setRoomId] = useState(id);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (id) loadRoom();
  }, [id]);

  const loadRoom = async () => {
    try {
      const res = await api.get(`/rooms/${id}`);
      setRoom(res.data);
      setName(res.data.name);
      setSeats(res.data.seats || []);
      setRoomId(res.data.id);
    } catch {
      showToast('Fehler beim Laden', 'error');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew && !roomId) {
        const res = await api.post('/rooms', { name });
        setRoomId(res.data.id);
        setRoom(res.data);
        navigate(`/rooms/${res.data.id}`, { replace: true });
        showToast('Zimmer erstellt');
      } else {
        await api.put(`/rooms/${roomId}`, { name });
        // Save seats
        await api.put(`/rooms/${roomId}/seats`, {
          seats: seats.map((s, i) => ({
            seat_number: i + 1,
            x_position: s.x_position,
            y_position: s.y_position,
          })),
        });
        showToast('Gespeichert');
      }
    } catch {
      showToast('Fehler beim Speichern', 'error');
    }
    setSaving(false);
  };

  const handleUpload = async (file) => {
    if (!roomId) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('floorplan', file);
    try {
      const res = await api.post(`/rooms/${roomId}/floorplan`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRoom(res.data);
      showToast('Bild hochgeladen');
    } catch {
      showToast('Fehler beim Upload', 'error');
    }
    setUploading(false);
  };

  const handleRemoveImage = async () => {
    if (!roomId) return;
    try {
      await api.delete(`/rooms/${roomId}/floorplan`);
      setRoom(r => ({ ...r, floorplan_image_path: null, image_width: 0, image_height: 0 }));
      setSeats([]);
      showToast('Bild entfernt');
    } catch {
      showToast('Fehler beim Entfernen', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Zimmer bearbeiten</h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/rooms')}
            className="bg-lime-100 hover:bg-lime-200 text-lime-800 font-medium py-2.5 px-5 rounded-lg text-sm transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 px-5 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Bezeichnung</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
              placeholder="z.B. Zimmer 101"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Grundriss Bild</label>
            <div className="flex gap-2">
              <label className="cursor-pointer bg-lime-100 hover:bg-lime-200 text-lime-800 font-medium py-2.5 px-4 rounded-lg text-sm transition-colors">
                {uploading ? 'Lade hoch...' : 'Bild auswählen...'}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={e => e.target.files[0] && handleUpload(e.target.files[0])}
                  disabled={!roomId || uploading}
                />
              </label>
              {room?.floorplan_image_path && (
                <button
                  onClick={handleRemoveImage}
                  className="text-red-500 hover:text-red-600 font-medium py-2.5 px-4 text-sm transition-colors"
                >
                  Bild entfernen
                </button>
              )}
            </div>
            {room?.image_width > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Originalgrösse: {room.image_width}x{room.image_height}px
              </p>
            )}
          </div>
        </div>
      </div>

      {roomId && room?.floorplan_image_path && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Sitzplätze positionieren</h2>
              <ul className="text-sm text-gray-500 mt-1 space-y-0.5">
                <li><strong>Klicken</strong> auf freie Fläche um einen Sitzplatz hinzuzufügen.</li>
                <li><strong>Ziehen</strong> (Drag & Drop) um einen Platz zu verschieben.</li>
                <li><strong>Klicken</strong> auf einen bestehenden Platz um ihn zu entfernen.</li>
              </ul>
            </div>
            <span className="bg-lime-100 text-lime-700 font-bold py-1.5 px-4 rounded-full text-sm">
              {seats.length} Plätze
            </span>
          </div>
          <SeatPlacer
            imageUrl={`/api/uploads/${room.floorplan_image_path}`}
            seats={seats}
            onSeatsChange={setSeats}
          />
        </div>
      )}

      {roomId && !room?.floorplan_image_path && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400">Lade zuerst ein Grundriss-Bild hoch, um Sitzplätze zu positionieren.</p>
        </div>
      )}
    </div>
  );
}
