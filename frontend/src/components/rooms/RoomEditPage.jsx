import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/StoreProvider';
import { ToastContext } from '../../App';
import SeatPlacer from './SeatPlacer';
import SketchEditor from './SketchEditor';
import Button, { buttonClasses } from '../common/Button';
import { validateSketchFile, toFileFormat } from '../../lib/sketch';

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
  const { getRoom, createRoom, updateRoom, saveAreas, saveSeats, setFloorplan, setSketch, removeFloorplan, getImageUrl } = useStore();
  const isNew = !id;

  const [name, setName] = useState('Neues Zimmer');
  const [room, setRoom] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [seats, setSeats] = useState([]);
  const [areas, setAreas] = useState([]);
  const [roomId, setRoomId] = useState(id);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editorMode, setEditorMode] = useState('seats');
  const [activeAreaId, setActiveAreaId] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [sketchEditorOpen, setSketchEditorOpen] = useState(false);
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

  const loadRoom = () => {
    const data = getRoom(id);
    if (!data) { showToast('Fehler beim Laden', 'error'); return; }
    setRoom(data);
    setName(data.name);
    setSeats(data.seats || []);
    setAreas(data.areas || []);
    setRoomId(data.id);
    setIsDirty(false);
    loadedRef.current = true;
  };

  // Grundriss-Bild als Object-URL auflösen
  useEffect(() => {
    let active = true;
    if (room?.floorplan_image_path) {
      getImageUrl(room.floorplan_image_path).then(u => { if (active) setImageUrl(u); });
    } else {
      setImageUrl(null);
    }
    return () => { active = false; };
  }, [room?.floorplan_image_path]);

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
        const created = await createRoom({ name });
        setRoomId(created.id);
        setRoom(getRoom(created.id));
        setIsDirty(false);
        navigate(`/rooms/${created.id}`, { replace: true });
        showToast('Zimmer erstellt');
      } else {
        await updateRoom(roomId, { name });

        const savedAreas = await saveAreas(roomId, areas.map((a) => ({
          name: a.name,
          color: a.color,
          x_pos: a.x_pos,
          y_pos: a.y_pos,
          width_pct: a.width_pct,
          height_pct: a.height_pct,
        })));

        const areaIdMap = new Map();
        areas.forEach((localArea, i) => {
          if (savedAreas[i]) areaIdMap.set(localArea.id, savedAreas[i].id);
        });

        await saveSeats(roomId, seats.map((s, i) => ({
          seat_number: i + 1,
          x_position: s.x_position,
          y_position: s.y_position,
          area_id: s.area_id ? (areaIdMap.get(s.area_id) || null) : null,
        })));

        const data = getRoom(roomId);
        setRoom(data);
        setSeats(data.seats || []);
        setAreas(data.areas || []);
        if (activeAreaId) {
          setActiveAreaId(areaIdMap.get(activeAreaId) || null);
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
    const isJson = file.type === 'application/json' || /\.json$/i.test(file.name);
    setUploading(true);
    try {
      if (isJson) {
        const text = await file.text();
        let parsed;
        try { parsed = JSON.parse(text); } catch { showToast('Datei ist kein gültiges JSON.', 'error'); setUploading(false); return; }
        const err = validateSketchFile(parsed);
        if (err) { showToast(`Ungültige Grundriss-Datei: ${err}`, 'error'); setUploading(false); return; }
        const data = await setSketch(roomId, parsed);
        setRoom(data);
        showToast('Grundriss geladen');
      } else {
        const data = await setFloorplan(roomId, file);
        setRoom(data);
        showToast('Bild hochgeladen');
      }
    } catch {
      showToast('Fehler beim Laden', 'error');
    }
    setUploading(false);
  };

  const downloadSketchJson = () => {
    if (!room?.floorplan_sketch) return;
    const blob = new Blob([JSON.stringify(toFileFormat(room.floorplan_sketch), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sitzmix-grundriss-${room.name || 'zimmer'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRemoveImage = async () => {
    if (!roomId) return;
    try {
      const data = await removeFloorplan(roomId);
      setRoom(data);
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
          <Button variant="ghost" onClick={() => navigate('/rooms')}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Speichern…' : 'Speichern'}
          </Button>
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
            <label className="block text-sm font-bold text-gray-900 mb-2">Grundriss</label>
            <div className="flex gap-2 flex-wrap">
              <label className={`${buttonClasses({ variant: 'outline' })} cursor-pointer ${(!roomId || uploading) ? 'opacity-40 cursor-not-allowed' : ''}`}>
                {uploading ? 'Lade…' : 'Datei auswählen'}
                <input
                  type="file"
                  accept="image/*,application/json,.json"
                  className="hidden"
                  onChange={e => e.target.files[0] && handleUpload(e.target.files[0])}
                  disabled={!roomId || uploading}
                />
              </label>
              <Button variant="outline" onClick={() => setSketchEditorOpen(true)} disabled={!roomId}>
                {room?.floorplan_sketch ? 'Skizze bearbeiten' : 'Grundriss skizzieren'}
              </Button>
              {room?.floorplan_sketch && (
                <Button variant="ghost" onClick={downloadSketchJson}>
                  Als JSON speichern
                </Button>
              )}
              {(room?.floorplan_image_path || room?.floorplan_sketch) && (
                <Button variant="danger" onClick={handleRemoveImage}>
                  Entfernen
                </Button>
              )}
            </div>
            {room?.floorplan_image_path && room?.image_width > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Originalgrösse: {room.image_width}x{room.image_height}px
              </p>
            )}
          </div>
        </div>
      </div>

      {roomId && (room?.floorplan_image_path || room?.floorplan_sketch) && (
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
              <Button variant="outline" size="sm" onClick={alignSeats} title="Sitzplätze am Raster ausrichten">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Ausrichten
              </Button>
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
            imageUrl={imageUrl}
            sketch={room?.floorplan_sketch || null}
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

      {roomId && !room?.floorplan_image_path && !room?.floorplan_sketch && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400">Lade ein Grundriss-Bild hoch oder skizziere einen Grundriss, um Sitzplätze zu positionieren.</p>
        </div>
      )}

      {sketchEditorOpen && (
        <SketchEditor
          initialSketch={room?.floorplan_sketch || null}
          onClose={() => setSketchEditorOpen(false)}
          onSave={async (sketch) => {
            const data = await setSketch(roomId, sketch);
            setRoom(data);
            setSketchEditorOpen(false);
            showToast('Grundriss gespeichert');
          }}
        />
      )}
    </div>
  );
}
