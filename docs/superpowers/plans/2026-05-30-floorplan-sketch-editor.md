# Grundriss-Skizzen-Editor — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ein Mini-Editor zum Skizzieren von Grundrissen (Rechteck/Kreis, Polygon-Punkt-Editing) als Alternative zum Bild-Upload; Skizze als JSON spe/ladbar, im Backup enthalten.

**Architecture:** Reine Geometrie/Validierung in `lib/sketch.js`; read-only SVG-Renderer `FloorplanSketch`; Modal `SketchEditor`; Store-Feld `floorplan_sketch` (exklusiv zum Bild); Integration in RoomEditPage/SeatPlacer/GeneratorPage/Export.

**Tech Stack:** React 19, SVG, HTML5 Pointer Events, Vitest.

---

## Task 1: `lib/sketch.js` — reine Helfer + Validierung

**Files:**
- Create: `frontend/src/lib/sketch.js`
- Create: `frontend/src/lib/sketch.test.js`

- [ ] **Step 1: Implementieren**

Create `frontend/src/lib/sketch.js`:
```js
const uid = () => crypto.randomUUID();

export function defaultSketch() {
  return { version: 1, width: 1000, height: 700, shapes: [] };
}

export function createRectangle(width, height) {
  const w = width * 0.4, h = height * 0.4;
  const x = (width - w) / 2, y = (height - h) / 2;
  return { id: uid(), type: 'polygon', points: [
    { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h },
  ] };
}

export function createCircle(width, height) {
  return { id: uid(), type: 'circle', cx: width / 2, cy: height / 2, r: Math.min(width, height) * 0.2 };
}

export function insertVertex(points, edgeIndex) {
  const a = points[edgeIndex];
  const b = points[(edgeIndex + 1) % points.length];
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const next = points.slice();
  next.splice(edgeIndex + 1, 0, mid);
  return next;
}

export function removeVertex(points, index) {
  if (points.length <= 3) return points;
  return points.filter((_, i) => i !== index);
}

export function moveVertex(points, index, x, y) {
  return points.map((p, i) => (i === index ? { x, y } : p));
}

export function toFileFormat(sketch) {
  return { type: 'sitzmix-floorplan', version: 1, width: sketch.width, height: sketch.height, shapes: sketch.shapes };
}

function isNum(n) { return typeof n === 'number' && Number.isFinite(n); }

export function validateSketchFile(json) {
  if (!json || typeof json !== 'object') return 'Datei ist kein gültiges JSON-Objekt.';
  if (json.type !== 'sitzmix-floorplan') return 'Kein SitzMix-Grundriss (falscher Typ).';
  if (!isNum(json.version) || json.version > 1) return `Version ${json.version} wird nicht unterstützt.`;
  if (!isNum(json.width) || !isNum(json.height) || json.width <= 0 || json.height <= 0) return 'Ungültige Canvas-Masse.';
  if (!Array.isArray(json.shapes)) return 'Formen fehlen oder sind ungültig.';
  for (const s of json.shapes) {
    if (s.type === 'polygon') {
      if (!Array.isArray(s.points) || s.points.length < 3) return 'Polygon mit zu wenigen Punkten.';
      if (!s.points.every(p => isNum(p.x) && isNum(p.y))) return 'Polygon mit ungültigen Punkten.';
    } else if (s.type === 'circle') {
      if (!isNum(s.cx) || !isNum(s.cy) || !isNum(s.r) || s.r <= 0) return 'Kreis mit ungültigen Werten.';
    } else {
      return `Unbekannter Formtyp: ${s.type}.`;
    }
  }
  return null;
}

// Stellt sicher, dass jede Form eine id hat (z.B. nach Datei-Import)
export function withIds(shapes) {
  return shapes.map(s => (s.id ? s : { ...s, id: uid() }));
}
```

- [ ] **Step 2: Tests**

Create `frontend/src/lib/sketch.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { defaultSketch, createRectangle, createCircle, insertVertex, removeVertex, moveVertex, validateSketchFile, toFileFormat } from './sketch';

describe('sketch helpers', () => {
  it('creates a 4-point rectangle polygon', () => {
    const r = createRectangle(1000, 700);
    expect(r.type).toBe('polygon');
    expect(r.points).toHaveLength(4);
    expect(r.id).toBeTruthy();
  });

  it('creates a circle within canvas', () => {
    const c = createCircle(1000, 700);
    expect(c.type).toBe('circle');
    expect(c.r).toBeGreaterThan(0);
  });

  it('inserts a vertex at the edge midpoint', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    const next = insertVertex(pts, 0);
    expect(next).toHaveLength(5);
    expect(next[1]).toEqual({ x: 5, y: 0 });
  });

  it('does not remove a vertex below 3 points', () => {
    const tri = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
    expect(removeVertex(tri, 0)).toBe(tri);
    const quad = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    expect(removeVertex(quad, 1)).toHaveLength(3);
  });

  it('moves a vertex immutably', () => {
    const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
    const next = moveVertex(pts, 0, 5, 5);
    expect(next[0]).toEqual({ x: 5, y: 5 });
    expect(pts[0]).toEqual({ x: 0, y: 0 });
  });

  it('validates a good file as null', () => {
    const ok = toFileFormat(defaultSketch());
    ok.shapes = [createRectangle(1000, 700)];
    expect(validateSketchFile(ok)).toBeNull();
  });

  it('rejects wrong type, version, broken shapes', () => {
    expect(validateSketchFile({ type: 'x' })).toMatch(/Kein SitzMix-Grundriss/);
    expect(validateSketchFile({ type: 'sitzmix-floorplan', version: 2, width: 1, height: 1, shapes: [] })).toMatch(/Version/);
    expect(validateSketchFile({ type: 'sitzmix-floorplan', version: 1, width: 1, height: 1, shapes: [{ type: 'polygon', points: [{ x: 0, y: 0 }] }] })).toMatch(/zu wenigen Punkten/);
    expect(validateSketchFile({ type: 'sitzmix-floorplan', version: 1, width: 1, height: 1, shapes: [{ type: 'star' }] })).toMatch(/Unbekannter Formtyp/);
  });
});
```

- [ ] **Step 3: Test laufen lassen**

Run: `cd frontend && npm test -- sketch`
Expected: 7 passed.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/sketch.js frontend/src/lib/sketch.test.js
git commit -m "feat: add sketch geometry helpers + file validation"
```

---

## Task 2: Store — `floorplan_sketch`

**Files:**
- Modify: `frontend/src/lib/store.js`
- Modify: `frontend/src/lib/store.test.js`

- [ ] **Step 1: createRoom-Initialwert**

In `createRoom` das Objekt um `floorplan_sketch: null` ergänzen:
```js
const r = { id: uid(), name: name || 'Neues Zimmer', floorplan_image_path: null, floorplan_sketch: null, image_width: 0, image_height: 0, seats: [], areas: [] };
```

- [ ] **Step 2: getRoom/listRooms um Feld erweitern**

In `getRoom` den Rückgabewert um `floorplan_sketch: r.floorplan_sketch` ergänzen.
In `listRooms` jedem Eintrag `floorplan_sketch: r.floorplan_sketch` hinzufügen.

- [ ] **Step 3: setFloorplan löscht Skizze**

In `setFloorplan`, nach dem Setzen der Bildwerte ergänzen: `r.floorplan_sketch = null;`
(vor `await persist();`).

- [ ] **Step 4: setSketch + removeFloorplan**

`removeFloorplan` zusätzlich: `r.floorplan_sketch = null;`.

Neue Funktion (nach `removeFloorplan`):
```js
export async function setSketch(roomId, sketch) {
  const r = state.rooms.find(x => x.id === roomId);
  if (!r) return null;
  if (r.floorplan_image_path) { await deleteImage(r.floorplan_image_path); urlCache.delete(r.floorplan_image_path); }
  r.floorplan_image_path = null;
  r.floorplan_sketch = { version: sketch.version || 1, width: sketch.width, height: sketch.height, shapes: sketch.shapes };
  r.image_width = sketch.width;
  r.image_height = sketch.height;
  await persist();
  return getRoom(roomId);
}
```

- [ ] **Step 5: generate gibt Skizze mit**

In `generate`, im zurückgegebenen `room`-Objekt `floorplan_sketch: r.floorplan_sketch` ergänzen.

- [ ] **Step 6: Tests ergänzen**

Im `describe('room store', …)` von `frontend/src/lib/store.test.js`:
```js
  it('setSketch stores sketch and clears image reference', async () => {
    const r = await store.createRoom({ name: 'Zi' });
    const sketch = { version: 1, width: 1000, height: 700, shapes: [{ id: 'p1', type: 'polygon', points: [{x:0,y:0},{x:10,y:0},{x:10,y:10}] }] };
    const room = await store.setSketch(r.id, sketch);
    expect(room.floorplan_sketch.shapes).toHaveLength(1);
    expect(room.floorplan_image_path).toBeNull();
    expect(room.image_width).toBe(1000);
    expect(store.listRooms()[0].floorplan_sketch).toBeTruthy();
  });
```

- [ ] **Step 7: Test laufen lassen**

Run: `cd frontend && npm test -- store`
Expected: 10 passed.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/lib/store.js frontend/src/lib/store.test.js
git commit -m "feat: store support for floorplan_sketch (exclusive with image)"
```

---

## Task 3: Export/Import inkl. Skizze

**Files:**
- Modify: `frontend/src/lib/exportImport.js`
- Modify: `frontend/src/lib/exportImport.test.js`

- [ ] **Step 1: buildExport**

Im Room-Mapping von `buildExport` das Feld `floorplan_sketch: r.floorplan_sketch || null` zum gepushten Objekt ergänzen (neben `name, image_width, image_height, image, areas, seats`).

- [ ] **Step 2: applyImport**

In `applyImport`, im Room-Loop nach `saveSeats(...)` und vor/statt der Bild-Zeile:
```js
    if (room.floorplan_sketch) {
      await store.setSketch(created.id, room.floorplan_sketch);
    } else if (room.image) {
      await store.setFloorplan(created.id, dataUrlToBlob(room.image));
    }
```
(ersetzt die bisherige alleinige `if (room.image)`-Zeile).

- [ ] **Step 3: Test ergänzen**

In `frontend/src/lib/exportImport.test.js` ein Test:
```js
  it('round-trips a room with a sketch', async () => {
    const r = await store.createRoom({ name: 'Zi' });
    await store.setSketch(r.id, { version: 1, width: 800, height: 600, shapes: [{ id: 'c1', type: 'circle', cx: 100, cy: 100, r: 50 }] });
    const data = await buildExport({ classIds: [], roomIds: [r.id] });
    expect(data.rooms[0].floorplan_sketch.shapes).toHaveLength(1);
    store._setState({ schemaVersion: 2, classes: [], rooms: [] });
    await applyImport(data);
    const imported = store.listRooms()[0];
    expect(imported.floorplan_sketch.width).toBe(800);
  });
```

- [ ] **Step 4: Test laufen lassen**

Run: `cd frontend && npm test -- exportImport`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/exportImport.js frontend/src/lib/exportImport.test.js
git commit -m "feat: include floorplan_sketch in export/import"
```

---

## Task 4: `FloorplanSketch` read-only Renderer

**Files:**
- Create: `frontend/src/components/rooms/FloorplanSketch.jsx`

- [ ] **Step 1: Komponente**

Create `frontend/src/components/rooms/FloorplanSketch.jsx`:
```js
export default function FloorplanSketch({ sketch, className = '' }) {
  if (!sketch) return null;
  const { width, height, shapes } = sketch;
  const stroke = Math.max(width, height) * 0.004;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`block w-full h-full ${className}`}
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <rect x="0" y="0" width={width} height={height} fill="#f8fafc" />
      {shapes.map(s => {
        if (s.type === 'polygon') {
          return <polygon key={s.id} points={s.points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="#e5e7eb" stroke="#475569" strokeWidth={stroke} strokeLinejoin="round" />;
        }
        if (s.type === 'circle') {
          return <circle key={s.id} cx={s.cx} cy={s.cy} r={s.r}
            fill="#e5e7eb" stroke="#475569" strokeWidth={stroke} />;
        }
        return null;
      })}
    </svg>
  );
}
```

- [ ] **Step 2: Build-Check**

Run: `cd frontend && npm run build`
Expected: erfolgreich.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/rooms/FloorplanSketch.jsx
git commit -m "feat: add read-only FloorplanSketch SVG renderer"
```

---

## Task 5: `SketchEditor` Modal

**Files:**
- Create: `frontend/src/components/rooms/SketchEditor.jsx`

- [ ] **Step 1: Editor implementieren**

Create `frontend/src/components/rooms/SketchEditor.jsx`. Logischer Aufbau:
- Props: `initialSketch` (oder null), `onSave(sketch)`, `onClose()`.
- State: `shapes` (Kopie aus initialSketch.shapes oder []), `width`/`height` (aus
  initialSketch oder 1000/700), `selectedId`, `selectedVertex` ({shapeId,index}|null),
  `interaction` (Pointer-Drag-Zustand). Snap-Schritt = `width/50` bzw `height/50`.
- Koordinatenumrechnung: Pointer-Client → SVG-Einheiten via
  `containerRef.getBoundingClientRect()` und Skalierung auf `width`/`height`.
- Render: Modal-Overlay; Toolbar mit Buttons; darunter ein quadratisch begrenzter
  Canvas-Bereich (`style={{ aspectRatio: width/height }}`, `bg-white border`), in dem ein
  `<svg viewBox="0 0 width height">` Formen + Edit-Griffe zeichnet.
- Toolbar-Buttons:
  - „Rechteck": `setShapes(s => [...s, createRectangle(width,height)])`, auswählen.
  - „Kreis": `setShapes(s => [...s, createCircle(width,height)])`, auswählen.
  - „Als JSON speichern": Blob aus `toFileFormat({version:1,width,height,shapes})` →
    Download `sitzmix-grundriss.json`.
  - „Abbrechen" → `onClose()`.
  - „Fertig" → `onSave({ version:1, width, height, shapes })`.
- Formen-Rendering (interaktiv):
  - Polygon: `<polygon>` (Klick wählt aus, Pointer-Drag verschiebt alle Punkte um Delta).
    Wenn ausgewählt: Eckpunkte als `<circle r=8>` (Drag = `moveVertex`); Kantenmitten als
    hohle `<circle>` mit „+" (Klick = `insertVertex(points, edgeIndex)` + neuen Punkt
    auswählen).
  - Circle: `<circle>` (Drag = verschieben). Wenn ausgewählt: ein Radius-Griff bei
    `(cx + r, cy)` (Drag = `r = max(min, dist)`).
- Delete/Backspace: wenn `selectedVertex` → `removeVertex`; sonst wenn `selectedId` →
  Form löschen. (Eingaben in INPUT/TEXTAREA ignorieren.)
- Clamping aller Koordinaten auf `[0,width]`/`[0,height]`.

Vollständige Komponente:
```jsx
import { useRef, useState, useEffect, useCallback } from 'react';
import { createRectangle, createCircle, insertVertex, removeVertex, moveVertex, toFileFormat } from '../../lib/sketch';

export default function SketchEditor({ initialSketch, onSave, onClose }) {
  const width = initialSketch?.width || 1000;
  const height = initialSketch?.height || 700;
  const svgRef = useRef(null);
  const [shapes, setShapes] = useState(initialSketch?.shapes ? initialSketch.shapes.map(s => ({ ...s })) : []);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedVertex, setSelectedVertex] = useState(null); // { shapeId, index }
  const [drag, setDrag] = useState(null);

  const clampX = (x) => Math.max(0, Math.min(width, x));
  const clampY = (y) => Math.max(0, Math.min(height, y));

  const toUnits = useCallback((clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: clampX(((clientX - rect.left) / rect.width) * width),
      y: clampY(((clientY - rect.top) / rect.height) * height),
    };
  }, [width, height]);

  const updateShape = (id, fn) => setShapes(list => list.map(s => (s.id === id ? fn(s) : s)));

  const onPointerMove = (e) => {
    if (!drag) return;
    const p = toUnits(e.clientX, e.clientY);
    if (drag.kind === 'move-shape') {
      const dx = p.x - drag.last.x, dy = p.y - drag.last.y;
      updateShape(drag.id, s => {
        if (s.type === 'polygon') return { ...s, points: s.points.map(pt => ({ x: clampX(pt.x + dx), y: clampY(pt.y + dy) })) };
        return { ...s, cx: clampX(s.cx + dx), cy: clampY(s.cy + dy) };
      });
      setDrag({ ...drag, last: p });
    } else if (drag.kind === 'move-vertex') {
      updateShape(drag.id, s => ({ ...s, points: moveVertex(s.points, drag.index, p.x, p.y) }));
    } else if (drag.kind === 'radius') {
      updateShape(drag.id, s => ({ ...s, r: Math.max(width * 0.02, Math.hypot(p.x - s.cx, p.y - s.cy)) }));
    }
  };
  const endDrag = () => setDrag(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (selectedVertex) {
        e.preventDefault();
        updateShape(selectedVertex.shapeId, s => ({ ...s, points: removeVertex(s.points, selectedVertex.index) }));
        setSelectedVertex(null);
      } else if (selectedId) {
        e.preventDefault();
        setShapes(list => list.filter(s => s.id !== selectedId));
        setSelectedId(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedVertex, selectedId]);

  const addRect = () => { const r = createRectangle(width, height); setShapes(s => [...s, r]); setSelectedId(r.id); setSelectedVertex(null); };
  const addCircle = () => { const c = createCircle(width, height); setShapes(s => [...s, c]); setSelectedId(c.id); setSelectedVertex(null); };
  const saveJson = () => {
    const blob = new Blob([JSON.stringify(toFileFormat({ version: 1, width, height, shapes }), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sitzmix-grundriss.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const vr = Math.max(width, height) * 0.012; // vertex handle radius
  const sw = Math.max(width, height) * 0.004;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-gray-900">Grundriss skizzieren</h2>
          <div className="flex items-center gap-2">
            <button onClick={addRect} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">+ Rechteck</button>
            <button onClick={addCircle} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">+ Kreis</button>
            <button onClick={saveJson} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Als JSON speichern</button>
          </div>
        </div>

        <div className="p-6 overflow-auto">
          <p className="text-xs text-gray-500 mb-3">
            Form anklicken zum Auswählen · Körper ziehen zum Verschieben · Eckpunkte ziehen · hohle <span className="font-bold">+</span>-Punkte auf den Kanten fügen Ecken hinzu · Delete löscht Punkt/Form.
          </p>
          <div className="bg-white border border-gray-200 rounded-lg select-none" style={{ aspectRatio: `${width} / ${height}` }}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-full"
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
              onClick={(e) => { if (e.target === e.currentTarget || e.target.tagName === 'rect') { setSelectedId(null); setSelectedVertex(null); } }}
            >
              <rect x="0" y="0" width={width} height={height} fill="#f8fafc" />
              {shapes.map(s => {
                const selected = s.id === selectedId;
                if (s.type === 'polygon') {
                  return (
                    <g key={s.id}>
                      <polygon
                        points={s.points.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="#e5e7eb" stroke={selected ? '#2563eb' : '#475569'} strokeWidth={sw} strokeLinejoin="round"
                        style={{ cursor: 'move' }}
                        onPointerDown={(e) => { e.stopPropagation(); e.target.setPointerCapture?.(e.pointerId); setSelectedId(s.id); setSelectedVertex(null); setDrag({ kind: 'move-shape', id: s.id, last: toUnits(e.clientX, e.clientY) }); }}
                      />
                      {selected && s.points.map((p, i) => {
                        const b = s.points[(i + 1) % s.points.length];
                        const mid = { x: (p.x + b.x) / 2, y: (p.y + b.y) / 2 };
                        return (
                          <g key={i}>
                            <circle cx={mid.x} cy={mid.y} r={vr * 0.8} fill="white" stroke="#2563eb" strokeWidth={sw}
                              style={{ cursor: 'copy' }}
                              onPointerDown={(e) => { e.stopPropagation(); updateShape(s.id, sh => ({ ...sh, points: insertVertex(sh.points, i) })); setSelectedVertex({ shapeId: s.id, index: i + 1 }); }} />
                            <circle cx={p.x} cy={p.y} r={vr} fill={selectedVertex && selectedVertex.shapeId === s.id && selectedVertex.index === i ? '#2563eb' : 'white'} stroke="#2563eb" strokeWidth={sw}
                              style={{ cursor: 'grab' }}
                              onPointerDown={(e) => { e.stopPropagation(); e.target.setPointerCapture?.(e.pointerId); setSelectedVertex({ shapeId: s.id, index: i }); setDrag({ kind: 'move-vertex', id: s.id, index: i }); }} />
                          </g>
                        );
                      })}
                    </g>
                  );
                }
                return (
                  <g key={s.id}>
                    <circle cx={s.cx} cy={s.cy} r={s.r} fill="#e5e7eb" stroke={selected ? '#2563eb' : '#475569'} strokeWidth={sw}
                      style={{ cursor: 'move' }}
                      onPointerDown={(e) => { e.stopPropagation(); e.target.setPointerCapture?.(e.pointerId); setSelectedId(s.id); setSelectedVertex(null); setDrag({ kind: 'move-shape', id: s.id, last: toUnits(e.clientX, e.clientY) }); }} />
                    {selected && (
                      <circle cx={s.cx + s.r} cy={s.cy} r={vr} fill="white" stroke="#2563eb" strokeWidth={sw}
                        style={{ cursor: 'ew-resize' }}
                        onPointerDown={(e) => { e.stopPropagation(); e.target.setPointerCapture?.(e.pointerId); setSelectedId(s.id); setDrag({ kind: 'radius', id: s.id }); }} />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
          <button onClick={() => { if (selectedId) { setShapes(list => list.filter(s => s.id !== selectedId)); setSelectedId(null); } }}
            disabled={!selectedId} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30">Form löschen</button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Abbrechen</button>
            <button onClick={() => onSave({ version: 1, width, height, shapes })} className="px-4 py-2 text-sm font-medium text-white bg-lime-600 hover:bg-lime-700 rounded-lg">Fertig</button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build-Check**

Run: `cd frontend && npm run build`
Expected: erfolgreich.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/rooms/SketchEditor.jsx
git commit -m "feat: add SketchEditor modal (rect/circle, vertex editing)"
```

---

## Task 6: SeatPlacer — Skizze als Hintergrund

**Files:**
- Modify: `frontend/src/components/rooms/SeatPlacer.jsx`

- [ ] **Step 1: sketch-Prop + Render**

`SeatPlacer`-Signatur um `sketch = null` erweitern. Import ergänzen:
`import FloorplanSketch from './FloorplanSketch';`
Den `<img className="floorplan-img" …>` ersetzen durch eine Verzweigung:
```jsx
{sketch ? (
  <div className="floorplan-img w-full block pointer-events-none" style={{ aspectRatio: `${sketch.width} / ${sketch.height}` }}>
    <FloorplanSketch sketch={sketch} />
  </div>
) : (
  <img src={imageUrl} alt="Grundriss" className="floorplan-img w-full block pointer-events-none" draggable={false} />
)}
```
(Die `floorplan-img`-Klasse bleibt für die Klick-Target-Logik in `handleContainerClick`.)

- [ ] **Step 2: Build-Check**

Run: `cd frontend && npm run build`
Expected: erfolgreich.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/rooms/SeatPlacer.jsx
git commit -m "feat: render sketch background in SeatPlacer"
```

---

## Task 7: RoomEditPage — Einstieg, Datei-Erkennung, Editor

**Files:**
- Modify: `frontend/src/components/rooms/RoomEditPage.jsx`

- [ ] **Step 1: Imports + State + Hook**

Ergänzen:
```js
import SketchEditor from './SketchEditor';
import { validateSketchFile } from '../../lib/sketch';
```
Store-Hook um `setSketch` erweitern: `const { …, setSketch } = useStore();`
State: `const [sketchEditorOpen, setSketchEditorOpen] = useState(false);`

- [ ] **Step 2: Datei-Erkennung im Upload**

`handleUpload(file)` umbauen: zuerst prüfen, ob JSON (per `file.type === 'application/json'`
oder Endung `.json`):
```js
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
      setRoom(data); showToast('Grundriss geladen');
    } else {
      const data = await setFloorplan(roomId, file);
      setRoom(data); showToast('Bild hochgeladen');
    }
  } catch { showToast('Fehler beim Laden', 'error'); }
  setUploading(false);
};
```
Datei-Input `accept` erweitern: `accept="image/png,image/jpeg,application/json,.json"`.

- [ ] **Step 3: Buttons „Grundriss skizzieren" / „Skizze bearbeiten" / „Als JSON speichern"**

Im Grundriss-Bereich neben „Bild auswählen…": Button **„Grundriss skizzieren"**
(`onClick={() => setSketchEditorOpen(true)}`, disabled wenn `!roomId`).
Wenn `room?.floorplan_sketch`: statt „Bild entfernen" die Buttons **„Skizze bearbeiten"**
(öffnet Editor), **„Als JSON speichern"** (`toFileFormat`-Download), **„Entfernen"**
(`removeFloorplan`). Wenn `room?.floorplan_image_path`: „Bild entfernen" wie bisher.

Konkret die Bild-Buttons-Zeile ersetzen durch:
```jsx
<div className="flex gap-2 flex-wrap">
  <label className="cursor-pointer bg-lime-100 hover:bg-lime-200 text-lime-800 font-medium py-2.5 px-4 rounded-lg text-sm transition-colors">
    {uploading ? 'Lade…' : 'Bild / JSON auswählen…'}
    <input type="file" accept="image/png,image/jpeg,application/json,.json" className="hidden"
      onChange={e => e.target.files[0] && handleUpload(e.target.files[0])} disabled={!roomId || uploading} />
  </label>
  <button onClick={() => setSketchEditorOpen(true)} disabled={!roomId}
    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-40">
    {room?.floorplan_sketch ? 'Skizze bearbeiten' : 'Grundriss skizzieren'}
  </button>
  {room?.floorplan_sketch && (
    <button onClick={downloadSketchJson} className="text-gray-600 hover:text-gray-800 font-medium py-2.5 px-3 text-sm">Als JSON speichern</button>
  )}
  {(room?.floorplan_image_path || room?.floorplan_sketch) && (
    <button onClick={handleRemoveImage} className="text-red-500 hover:text-red-600 font-medium py-2.5 px-3 text-sm">Entfernen</button>
  )}
</div>
```
Helfer ergänzen (mit `import { toFileFormat } from '../../lib/sketch';`):
```js
const downloadSketchJson = () => {
  if (!room?.floorplan_sketch) return;
  const blob = new Blob([JSON.stringify(toFileFormat(room.floorplan_sketch), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `sitzmix-grundriss-${room.name || 'zimmer'}.json`; a.click();
  URL.revokeObjectURL(url);
};
```

- [ ] **Step 4: Editor-Bereich-Gate auf Skizze ODER Bild erweitern**

Die Bedingung, die SeatPlacer + Editor-Tools zeigt, ist aktuell
`roomId && room?.floorplan_image_path`. Auf `roomId && (room?.floorplan_image_path || room?.floorplan_sketch)` ändern.
Die „kein Grundriss"-Hinweisbox-Bedingung entsprechend auf
`roomId && !room?.floorplan_image_path && !room?.floorplan_sketch` ändern.
SeatPlacer-Aufruf um `sketch={room?.floorplan_sketch || null}` ergänzen; `imageUrl={imageUrl}` bleibt.

- [ ] **Step 5: SketchEditor-Modal rendern**

Am Ende des Returns (vor schliessendem Fragment/Div):
```jsx
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
```

- [ ] **Step 6: Build-Check**

Run: `cd frontend && npm run build`
Expected: erfolgreich.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/rooms/RoomEditPage.jsx
git commit -m "feat: sketch entry points + JSON detection in RoomEditPage"
```

---

## Task 8: GeneratorPage — Skizze in Ergebnis-Ansicht

**Files:**
- Modify: `frontend/src/components/generator/GeneratorPage.jsx`

- [ ] **Step 1: Import + Render-Verzweigung**

`import FloorplanSketch from '../rooms/FloorplanSketch';` ergänzen.
In `renderSeatingPlan`, den Bild-Block so erweitern, dass bei vorhandener Skizze die
Skizze gerendert wird:
```jsx
{result.room.floorplan_sketch ? (
  <div className={sizeVariant === 'large' ? 'block max-h-[88vh]' : 'w-full block'}
       style={{ aspectRatio: `${result.room.floorplan_sketch.width} / ${result.room.floorplan_sketch.height}` }}>
    <FloorplanSketch sketch={result.room.floorplan_sketch} />
  </div>
) : planImageUrl ? (
  <img src={planImageUrl} alt="Grundriss" className={sizeVariant === 'large' ? 'block max-h-[88vh] w-auto' : 'w-full block'} draggable={false} />
) : (
  <div className={`aspect-video bg-gray-200 flex items-center justify-center text-gray-400 ${sizeVariant === 'large' ? 'min-w-[60vw]' : ''}`}>
    Kein Grundriss vorhanden
  </div>
)}
```

- [ ] **Step 2: Build + alle Tests**

Run: `cd frontend && npm run build && npm test`
Expected: Build erfolgreich, alle Tests grün.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/generator/GeneratorPage.jsx
git commit -m "feat: render floorplan sketch in generator result"
```

---

## Task 9: Browser-Verifikation

- [ ] **Step 1:** Neues Zimmer → „Grundriss skizzieren" → Rechteck einfügen.
- [ ] **Step 2:** Punkt auf Kantenmitte hinzufügen, ziehen → L-Form. Kreis einfügen.
- [ ] **Step 3:** „Fertig" → Skizze erscheint als Hintergrund; Sitze darüber platzieren.
- [ ] **Step 4:** „Als JSON speichern" → Datei; neues Zimmer → diese JSON über „Bild/JSON auswählen" laden → Skizze erscheint, editierbar.
- [ ] **Step 5:** Ungültige JSON-Datei laden → klare Fehlermeldung, Zimmer unverändert.
- [ ] **Step 6:** Generator: Klasse + Skizzen-Zimmer → Plan zeigt Skizze; PNG-Export enthält Skizze.
- [ ] **Step 7:** Bild hochladen bei Skizzen-Zimmer → ersetzt Skizze (entweder/oder).

## Self-Review (durchgeführt)

- **Spec-Abdeckung:** Datenmodell + Exklusivität (T2), Validierung/Helfer (T1),
  Renderer (T4), Editor mit Punkt-Editing (T5), Einstiege + JSON-Erkennung + Fehler (T7),
  Seat-Hintergrund (T6), Generator (T8), Backup (T3), Tests (T1–T3).
- **Platzhalter:** keine.
- **Typkonsistenz:** Shape-Shapes (`polygon.points[{x,y}]`, `circle.cx/cy/r`, `id`)
  einheitlich über sketch.js, Renderer, Editor, Store, Export. Sketch-Objekt
  `{version,width,height,shapes}` konsistent; Datei-Wrapper nur via `toFileFormat`.
