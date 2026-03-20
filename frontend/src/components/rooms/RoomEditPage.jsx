import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { ToastContext } from '../../App';
import SeatPlacer from './SeatPlacer';

const AREA_COLORS = [
  '#C4B5FD', '#93C5FD', '#86EFAC',
  '#FCA5A5', '#FDBA74', '#FDE68A',
];

const GRID_STEP = 2;
const ALIGN_THRESHOLD = 3;

function snapToGrid(val) {
  return Math.round(val / GRID_STEP) * GRID_STEP;
}

let tempIdCounter = -1;

// Sitze automatisch dem Bereich zuweisen, in dem sie liegen
function autoAssignSeats(seats, areas) {
  return seats.map(s => {
    const matchingArea = areas.find(a =>
      s.x_position >= a.x_pos &&
      s.x_position <= a.x_pos + a.width_pct &&
      s.y_position >= a.y_pos &&
      s.y_position <= a.y_pos + a.height_pct
    );
    return { ...s, area_id: matchingArea ? matchingArea.id : null };
  });
}

export default function RoomEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useContext(ToastContext);
  const isNew = !id;

  const [name, setName] = useState('Neues Zimmer');
  const [room, setRoom] = useState(null);
  const [seats, setSeats] = useState([]);
  const [areas, setAreas] = useState([]);
  const [roomId, setRoomId] = useState(id);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editorMode, setEditorMode] = useState('seats');
  const [activeAreaId, setActiveAreaId] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (id) loadRoom();
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

  const loadRoom = async () => {
    try {
      const res = await api.get(`/rooms/${id}`);
      setRoom(res.data);
      setName(res.data.name);
      setSeats(res.data.seats || []);
      setAreas(res.data.areas || []);
      setRoomId(res.data.id);
      setIsDirty(false);
      loadedRef.current = true;
    } catch {
      showToast('Fehler beim Laden', 'error');
    }
  };

  // Wenn Bereiche geändert werden (Move/Resize) → Sitze auto-zuweisen
  const handleAreasChange = useCallback((newAreas) => {
    setAreas(newAreas);
    setSeats(prev => autoAssignSeats(prev, newAreas));
    markDirty();
  }, []);

  // Wenn Sitze geändert werden (hinzufügen/verschieben/löschen) → Bereiche auto-zuweisen
  const handleSeatsChange = useCallback((newSeats) => {
    setSeats(autoAssignSeats(newSeats, areas));
    markDirty();
  }, [areas]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew && !roomId) {
        const res = await api.post('/rooms', { name });
        setRoomId(res.data.id);
        setRoom(res.data);
        setIsDirty(false);
        navigate(`/rooms/${res.data.id}`, { replace: true });
        showToast('Zimmer erstellt');
      } else {
        await api.put(`/rooms/${roomId}`, { name });

        const savedAreasRes = await api.put(`/rooms/${roomId}/areas`, {
          areas: areas.map((a, i) => ({
            name: a.name,
            color: a.color,
            sort_order: i,
            x_pos: a.x_pos,
            y_pos: a.y_pos,
            width_pct: a.width_pct,
            height_pct: a.height_pct,
          })),
        });
        const savedAreas = savedAreasRes.data;

        const areaIdMap = new Map();
        areas.forEach((localArea, i) => {
          if (savedAreas[i]) areaIdMap.set(localArea.id, savedAreas[i].id);
        });

        await api.put(`/rooms/${roomId}/seats`, {
          seats: seats.map((s, i) => ({
            seat_number: i + 1,
            x_position: s.x_position,
            y_position: s.y_position,
            area_id: s.area_id ? (areaIdMap.get(s.area_id) || null) : null,
          })),
        });

        const res = await api.get(`/rooms/${roomId}`);
        setRoom(res.data);
        setSeats(res.data.seats || []);
        setAreas(res.data.areas || []);
        if (activeAreaId) {
          const mappedId = areaIdMap.get(activeAreaId);
          setActiveAreaId(mappedId || null);
        }

        setIsDirty(false);
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
      setAreas([]);
      showToast('Bild entfernt');
    } catch {
      showToast('Fehler beim Entfernen', 'error');
    }
  };

  // ── Bereich-Verwaltung ──

  const addArea = () => {
    const colorIndex = areas.length % AREA_COLORS.length;
    const newArea = {
      id: tempIdCounter--,
      name: `Bereich ${areas.length + 1}`,
      color: AREA_COLORS[colorIndex],
      sort_order: areas.length,
      x_pos: 10 + (areas.length % 3) * 30,
      y_pos: 10 + Math.floor(areas.length / 3) * 35,
      width_pct: 22,
      height_pct: 26,
    };
    const newAreas = [...areas, newArea];
    setAreas(newAreas);
    setActiveAreaId(newArea.id);
    setEditorMode('areas');
    setSeats(prev => autoAssignSeats(prev, newAreas));
    markDirty();
  };

  // Bereich über Kontextmenü an bestimmter Position hinzufügen
  const handleAddAreaFromMap = (x, y) => {
    const colorIndex = areas.length % AREA_COLORS.length;
    const newArea = {
      id: tempIdCounter--,
      name: `Bereich ${areas.length + 1}`,
      color: AREA_COLORS[colorIndex],
      sort_order: areas.length,
      x_pos: Math.max(0, x - 11),
      y_pos: Math.max(0, y - 13),
      width_pct: 22,
      height_pct: 26,
    };
    const newAreas = [...areas, newArea];
    setAreas(newAreas);
    setActiveAreaId(newArea.id);
    setEditorMode('areas');
    setSeats(prev => autoAssignSeats(prev, newAreas));
    markDirty();
  };

  const removeArea = (areaId) => {
    const newAreas = areas.filter(a => a.id !== areaId);
    setAreas(newAreas);
    setSeats(prev => autoAssignSeats(prev, newAreas));
    if (activeAreaId === areaId) setActiveAreaId(null);
    markDirty();
  };

  const renameArea = (areaId, newName) => {
    setAreas(areas.map(a => a.id === areaId ? { ...a, name: newName } : a));
    markDirty();
  };

  // ── Sitzplätze ausrichten ──

  const alignSeats = () => {
    if (seats.length === 0) return;

    let aligned = seats.map(s => ({
      ...s,
      x_position: snapToGrid(s.x_position),
      y_position: snapToGrid(s.y_position),
    }));

    const usedY = new Set();
    for (let i = 0; i < aligned.length; i++) {
      if (usedY.has(i)) continue;
      const cluster = [i];
      for (let j = i + 1; j < aligned.length; j++) {
        if (usedY.has(j)) continue;
        if (Math.abs(aligned[i].y_position - aligned[j].y_position) <= ALIGN_THRESHOLD) cluster.push(j);
      }
      if (cluster.length > 1) {
        const avgY = cluster.reduce((sum, idx) => sum + aligned[idx].y_position, 0) / cluster.length;
        const snappedY = snapToGrid(avgY);
        for (const idx of cluster) { aligned[idx] = { ...aligned[idx], y_position: snappedY }; usedY.add(idx); }
      }
    }

    const usedX = new Set();
    for (let i = 0; i < aligned.length; i++) {
      if (usedX.has(i)) continue;
      const cluster = [i];
      for (let j = i + 1; j < aligned.length; j++) {
        if (usedX.has(j)) continue;
        if (Math.abs(aligned[i].x_position - aligned[j].x_position) <= ALIGN_THRESHOLD) cluster.push(j);
      }
      if (cluster.length > 1) {
        const avgX = cluster.reduce((sum, idx) => sum + aligned[idx].x_position, 0) / cluster.length;
        const snappedX = snapToGrid(avgX);
        for (const idx of cluster) { aligned[idx] = { ...aligned[idx], x_position: snappedX }; usedX.add(idx); }
      }
    }

    setSeats(aligned);
    showToast('Sitzplätze ausgerichtet');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Zimmer bearbeiten</h1>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
              Nicht gespeichert
            </span>
          )}
          <button
            onClick={() => navigate('/rooms')}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Bezeichnung</label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); markDirty(); }}
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
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setEditorMode('seats')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    editorMode === 'seats' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Sitzplätze
                </button>
                <button
                  onClick={() => setEditorMode('areas')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    editorMode === 'areas' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Bereiche
                </button>
              </div>
              <span className="bg-lime-100 text-lime-700 font-bold py-1.5 px-4 rounded-full text-sm">
                {seats.length} Plätze
              </span>
            </div>
            {seats.length > 0 && (
              <button
                onClick={alignSeats}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 text-sm transition-colors"
                title="Sitzplätze am Raster ausrichten"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Ausrichten
              </button>
            )}
          </div>

          {editorMode === 'seats' ? (
            <ul className="text-sm text-gray-500 mb-4 space-y-0.5">
              <li><strong>Klicken</strong> auf freie Fläche um einen Sitzplatz hinzuzufügen.</li>
              <li><strong>Ziehen</strong> um Plätze oder Bereiche zu verschieben.</li>
              <li><strong>Rechtsklick</strong> für Kontextmenü · <strong>Delete</strong>-Taste zum Löschen.</li>
              <li>Zum Löschen auch in den <strong>Papierkorb</strong> ziehen (unten rechts).</li>
            </ul>
          ) : (
            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {areas.map(area => (
                  <div
                    key={area.id}
                    onClick={() => setActiveAreaId(area.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 cursor-pointer transition-all ${
                      activeAreaId === area.id ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: area.color }} />
                    <input
                      type="text"
                      value={area.name}
                      onChange={e => renameArea(area.id, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="bg-transparent text-sm font-medium w-24 focus:outline-none focus:ring-1 focus:ring-lime-500 rounded px-1"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeArea(area.id); }}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={addArea}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 text-sm transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Neuer Bereich
                </button>
              </div>
              <p className="text-sm text-gray-500">
                {activeAreaId
                  ? 'Verschiebe oder resize den Bereich. Sitzplätze innerhalb werden automatisch zugewiesen.'
                  : 'Wähle einen Bereich aus oder nutze Rechtsklick auf der Karte.'}
              </p>
            </div>
          )}

          <SeatPlacer
            imageUrl={`/api/uploads/${room.floorplan_image_path}`}
            seats={seats}
            onSeatsChange={handleSeatsChange}
            mode={editorMode}
            areas={areas}
            onAreasChange={handleAreasChange}
            activeAreaId={activeAreaId}
            onAreaSelect={setActiveAreaId}
            onAddArea={handleAddAreaFromMap}
            onRemoveArea={removeArea}
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
