# SitzMix — Umbau auf clientseitige Architektur (Implementierungsplan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SitzMix von React+Express+MariaDB zu einer rein clientseitigen SPA umbauen, die alle Daten im Browser (IndexedDB) hält und nur statisch via Nginx ausgeliefert wird.

**Architecture:** Ein In-Memory-Store mit Full-Snapshot-Persistenz in IndexedDB ersetzt das gesamte Backend. Der Sitzplan-Algorithmus läuft im Browser. Grundriss-Bilder liegen als Blobs in IndexedDB. Import/Export über JSON-Dateien. Server = zustandsloser Nginx-Container.

**Tech Stack:** React 19, Vite 7, TailwindCSS 4, IndexedDB (eigener dünner Wrapper), Vitest + fake-indexeddb (Tests), Docker + Nginx (Deployment).

**Konvention:** Datenfelder bleiben in `snake_case` (wie heute in Komponenten, Algorithmus, Export). Store-Funktionen liefern dieselben Objekt-Shapes wie heute die REST-Endpunkte, damit die Komponenten minimal geändert werden.

---

## Dateistruktur (Ziel)

Neu im Frontend:
- `frontend/src/lib/seatingAlgorithm.js` — reiner Algorithmus (von backend verschoben).
- `frontend/src/lib/db.js` — IndexedDB-Wrapper (Snapshot + Bild-Blobs + Persistent Storage).
- `frontend/src/lib/store.js` — In-Memory-State, CRUD, Cascade, Auto-Persist, Generate, Export/Import.
- `frontend/src/lib/seedData.js` — Beispieldaten + Default-Grundriss-Loader für den ersten Start.
- `frontend/src/store/StoreProvider.jsx` — React-Context, lädt Snapshot, stellt `useStore()` bereit.
- `frontend/src/lib/*.test.js` — Unit-/Integrationstests.
- `frontend/public/default-floorplan.png` — gebündeltes Default-Grundrissbild (aus altem Seed).

Geändert:
- Alle Komponenten unter `frontend/src/components/**` (Datenquelle: Store statt axios).
- `frontend/src/main.jsx` (StoreProvider einhängen), `frontend/vite.config.js` (Proxy raus).
- `frontend/package.json` (axios raus, vitest/fake-indexeddb rein).

Gelöscht:
- `backend/`, `database/`, `frontend/src/api/client.js`.

Deployment:
- `Dockerfile` (Multi-Stage → Nginx), `docker-compose.yml` (ein Service), `nginx.conf`, `setup.sh`.

---

## Task 1: Test-Tooling einrichten

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.js`
- Create: `frontend/src/test/setup.js`

- [ ] **Step 1: Dev-Dependencies installieren**

Run:
```bash
cd frontend && npm install -D vitest fake-indexeddb
```

- [ ] **Step 2: Vitest-Konfiguration anlegen**

Create `frontend/vitest.config.js`:
```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
  },
});
```

Run: `cd frontend && npm install -D jsdom`

- [ ] **Step 3: Test-Setup für IndexedDB**

Create `frontend/src/test/setup.js`:
```js
import 'fake-indexeddb/auto';
```

- [ ] **Step 4: Test-Script ergänzen**

In `frontend/package.json` unter `"scripts"` hinzufügen:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Smoke-Test**

Create `frontend/src/test/smoke.test.js`:
```js
import { describe, it, expect } from 'vitest';
describe('tooling', () => {
  it('runs', () => { expect(1 + 1).toBe(2); });
  it('has indexedDB', () => { expect(typeof indexedDB).toBe('object'); });
});
```

Run: `cd frontend && npm test`
Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.js frontend/src/test
git commit -m "chore: add vitest + fake-indexeddb test tooling"
```

---

## Task 2: Sitzplan-Algorithmus ins Frontend verschieben

Der Algorithmus ist bereits reines, framework-freies JS und nutzt durchgängig `snake_case`-Inputs. Er wird **unverändert** verschoben.

**Files:**
- Create: `frontend/src/lib/seatingAlgorithm.js` (Kopie von `backend/services/seatingAlgorithm.js`)
- Create: `frontend/src/lib/seatingAlgorithm.test.js`

- [ ] **Step 1: Datei kopieren und auf ESM umstellen**

Inhalt von `backend/services/seatingAlgorithm.js` nach `frontend/src/lib/seatingAlgorithm.js` kopieren. Letzte Zeile
```js
module.exports = { generateSeatingPlan, buildAdjacencyMap };
```
ersetzen durch:
```js
export { generateSeatingPlan, buildAdjacencyMap };
```

- [ ] **Step 2: Test schreiben**

Create `frontend/src/lib/seatingAlgorithm.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { generateSeatingPlan } from './seatingAlgorithm';

const seats = [
  { id: 's1', seat_number: 1, x_position: 10, y_position: 10, area_id: 'a1' },
  { id: 's2', seat_number: 2, x_position: 90, y_position: 10, area_id: 'a2' },
];
const students = [
  { id: 'st1', name: 'A', color: '#fff' },
  { id: 'st2', name: 'B', color: '#000' },
];

describe('generateSeatingPlan', () => {
  it('assigns every student to a seat (sequential)', () => {
    const res = generateSeatingPlan(students, seats, [], { fillMode: 'sequential' });
    expect(res.success).toBe(true);
    const assigned = res.assignments.filter(a => a.student);
    expect(assigned).toHaveLength(2);
  });

  it('keeps a forbidden pair in different areas (per_area)', () => {
    const areas = [
      { id: 'a1', x_pos: 0, y_pos: 0, width_pct: 20, height_pct: 20, sort_order: 0 },
      { id: 'a2', x_pos: 80, y_pos: 0, width_pct: 20, height_pct: 20, sort_order: 1 },
    ];
    const rules = [{ student_a_id: 'st1', student_b_id: 'st2' }];
    const res = generateSeatingPlan(students, seats, rules, { areas, fillMode: 'per_area', personsPerArea: 1 });
    const seatOf = (name) => res.assignments.find(a => a.student?.name === name);
    expect(seatOf('A').areaId).not.toBe(seatOf('B').areaId);
  });

  it('returns all seats empty when there are no students', () => {
    const res = generateSeatingPlan([], seats, []);
    expect(res.success).toBe(true);
    expect(res.assignments.every(a => !a.student)).toBe(true);
  });
});
```

- [ ] **Step 3: Tests laufen lassen**

Run: `cd frontend && npm test -- seatingAlgorithm`
Expected: 3 passed.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/seatingAlgorithm.js frontend/src/lib/seatingAlgorithm.test.js
git commit -m "feat: port seating algorithm to frontend lib"
```

---

## Task 3: IndexedDB-Wrapper `db.js`

**Files:**
- Create: `frontend/src/lib/db.js`
- Create: `frontend/src/lib/db.test.js`

- [ ] **Step 1: Wrapper implementieren**

Create `frontend/src/lib/db.js`:
```js
const DB_NAME = 'sitzmix';
const DB_VERSION = 1;
const STORE_APP = 'app';
const STORE_IMAGES = 'images';
const SNAPSHOT_KEY = 'snapshot';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_APP)) db.createObjectStore(STORE_APP);
      if (!db.objectStoreNames.contains(STORE_IMAGES)) db.createObjectStore(STORE_IMAGES);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const os = t.objectStore(store);
    const result = fn(os);
    t.oncomplete = () => resolve(result?.result ?? result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function getSnapshot() {
  const db = await openDb();
  return tx(db, STORE_APP, 'readonly', (os) => os.get(SNAPSHOT_KEY));
}

export async function saveSnapshot(snapshot) {
  const db = await openDb();
  return tx(db, STORE_APP, 'readwrite', (os) => os.put(snapshot, SNAPSHOT_KEY));
}

export async function putImage(id, blob) {
  const db = await openDb();
  return tx(db, STORE_IMAGES, 'readwrite', (os) => os.put(blob, id));
}

export async function getImage(id) {
  const db = await openDb();
  return tx(db, STORE_IMAGES, 'readonly', (os) => os.get(id));
}

export async function deleteImage(id) {
  const db = await openDb();
  return tx(db, STORE_IMAGES, 'readwrite', (os) => os.delete(id));
}

export async function requestPersistentStorage() {
  if (navigator.storage?.persist) {
    try { return await navigator.storage.persist(); } catch { return false; }
  }
  return false;
}
```

- [ ] **Step 2: Test schreiben**

Create `frontend/src/lib/db.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest';
import { getSnapshot, saveSnapshot, putImage, getImage, deleteImage } from './db';

beforeEach(async () => {
  await new Promise((res) => {
    const r = indexedDB.deleteDatabase('sitzmix');
    r.onsuccess = r.onerror = () => res();
  });
});

describe('db', () => {
  it('returns undefined snapshot initially', async () => {
    expect(await getSnapshot()).toBeUndefined();
  });

  it('round-trips a snapshot', async () => {
    await saveSnapshot({ schemaVersion: 2, classes: [{ id: '1' }], rooms: [] });
    const snap = await getSnapshot();
    expect(snap.classes[0].id).toBe('1');
  });

  it('stores and deletes image blobs', async () => {
    const blob = new Blob(['x'], { type: 'image/png' });
    await putImage('img1', blob);
    expect(await getImage('img1')).toBeInstanceOf(Blob);
    await deleteImage('img1');
    expect(await getImage('img1')).toBeUndefined();
  });
});
```

- [ ] **Step 3: Tests laufen lassen**

Run: `cd frontend && npm test -- db`
Expected: 3 passed.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/db.js frontend/src/lib/db.test.js
git commit -m "feat: add IndexedDB wrapper (snapshot + image blobs)"
```

---

## Task 4: Store-Kern + Klassen-CRUD

Der Store hält den Snapshot im Speicher und persistiert nach jeder Mutation. Funktionen liefern dieselben Shapes wie heute die REST-Endpunkte.

**Files:**
- Create: `frontend/src/lib/store.js`
- Create: `frontend/src/lib/store.test.js`

- [ ] **Step 1: Store-Kern + Klassenfunktionen implementieren**

Create `frontend/src/lib/store.js`:
```js
import { getSnapshot, saveSnapshot, putImage, getImage, deleteImage } from './db';
import { generateSeatingPlan } from './seatingAlgorithm';

const PASTEL = ['#FFB3BA','#FFDFBA','#FFFFBA','#BAFFC9','#BAE1FF','#E8BAFF','#FFB3E6','#B3FFE6','#FFE6B3','#B3D4FF','#D4FFB3','#FFB3B3'];
const uid = () => crypto.randomUUID();

let state = { schemaVersion: 2, classes: [], rooms: [] };

export function _setState(s) { state = s; }            // nur für Tests/Provider
export function getState() { return state; }

async function persist() { await saveSnapshot(state); }

export async function loadFromDb() {
  const snap = await getSnapshot();
  if (snap && snap.classes && snap.rooms) state = snap;
  return state;
}

// ── Klassen ──
export function listClasses() {
  return state.classes.map(c => ({ id: c.id, name: c.name, studentCount: c.students.length }));
}

export function getClass(id) {
  const c = state.classes.find(x => x.id === id);
  if (!c) return null;
  const byId = new Map(c.students.map(s => [s.id, s]));
  return {
    id: c.id, name: c.name,
    students: c.students.map(s => ({ ...s })),
    rules: c.rules.map(r => ({
      id: r.id, student_a_id: r.student_a_id, student_b_id: r.student_b_id,
      studentA: byId.get(r.student_a_id) || null,
      studentB: byId.get(r.student_b_id) || null,
    })),
  };
}

export async function createClass({ name }) {
  const c = { id: uid(), name: name || 'Neue Klasse', students: [], rules: [] };
  state.classes.push(c);
  await persist();
  return { id: c.id, name: c.name };
}

export async function updateClass(id, { name }) {
  const c = state.classes.find(x => x.id === id);
  if (c) { c.name = name; await persist(); }
  return c ? { id: c.id, name: c.name } : null;
}

export async function deleteClass(id) {
  state.classes = state.classes.filter(c => c.id !== id);
  await persist();
}

function pickColor(c) { return PASTEL[c.students.length % PASTEL.length]; }

export async function addStudent(classId, { name }) {
  const c = state.classes.find(x => x.id === classId);
  if (!c) return null;
  const s = { id: uid(), name, color: pickColor(c) };
  c.students.push(s);
  await persist();
  return s;
}

export async function bulkAddStudents(classId, text) {
  const c = state.classes.find(x => x.id === classId);
  if (!c) return [];
  const names = text.split(/[\n,;]+/).map(n => n.trim()).filter(Boolean);
  const added = names.map(name => {
    const s = { id: uid(), name, color: PASTEL[(c.students.length) % PASTEL.length] };
    c.students.push(s);
    return s;
  });
  await persist();
  return added;
}

export async function deleteStudent(studentId) {
  for (const c of state.classes) {
    const before = c.students.length;
    c.students = c.students.filter(s => s.id !== studentId);
    if (c.students.length !== before) {
      c.rules = c.rules.filter(r => r.student_a_id !== studentId && r.student_b_id !== studentId);
    }
  }
  await persist();
}

export async function addRule(classId, { studentAId, studentBId }) {
  const c = state.classes.find(x => x.id === classId);
  if (!c) return null;
  const exists = c.rules.some(r =>
    (r.student_a_id === studentAId && r.student_b_id === studentBId) ||
    (r.student_a_id === studentBId && r.student_b_id === studentAId));
  if (exists) throw new Error('Diese Regel existiert bereits.');
  const r = { id: uid(), student_a_id: studentAId, student_b_id: studentBId };
  c.rules.push(r);
  await persist();
  const byId = new Map(c.students.map(s => [s.id, s]));
  return { ...r, studentA: byId.get(studentAId) || null, studentB: byId.get(studentBId) || null };
}

export async function deleteRule(ruleId) {
  for (const c of state.classes) c.rules = c.rules.filter(r => r.id !== ruleId);
  await persist();
}
```

- [ ] **Step 2: Tests schreiben**

Create `frontend/src/lib/store.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest';
import * as store from './store';

beforeEach(async () => {
  await new Promise((res) => {
    const r = indexedDB.deleteDatabase('sitzmix');
    r.onsuccess = r.onerror = () => res();
  });
  store._setState({ schemaVersion: 2, classes: [], rooms: [] });
});

describe('class store', () => {
  it('creates and lists classes', async () => {
    await store.createClass({ name: '3a' });
    const list = store.listClasses();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('3a');
    expect(list[0].studentCount).toBe(0);
  });

  it('adds students and bulk-imports', async () => {
    const c = await store.createClass({ name: '3a' });
    await store.addStudent(c.id, { name: 'Anna' });
    const added = await store.bulkAddStudents(c.id, 'Ben\nCara, Dora; Emil');
    expect(added).toHaveLength(4);
    expect(store.getClass(c.id).students).toHaveLength(5);
  });

  it('cascades rules when a student is deleted', async () => {
    const c = await store.createClass({ name: '3a' });
    const a = await store.addStudent(c.id, { name: 'Anna' });
    const b = await store.addStudent(c.id, { name: 'Ben' });
    await store.addRule(c.id, { studentAId: a.id, studentBId: b.id });
    await store.deleteStudent(a.id);
    expect(store.getClass(c.id).rules).toHaveLength(0);
  });

  it('rejects duplicate rules', async () => {
    const c = await store.createClass({ name: '3a' });
    const a = await store.addStudent(c.id, { name: 'Anna' });
    const b = await store.addStudent(c.id, { name: 'Ben' });
    await store.addRule(c.id, { studentAId: a.id, studentBId: b.id });
    await expect(store.addRule(c.id, { studentAId: b.id, studentBId: a.id })).rejects.toThrow();
  });

  it('persists across reload', async () => {
    await store.createClass({ name: 'Persist' });
    store._setState({ schemaVersion: 2, classes: [], rooms: [] });
    await store.loadFromDb();
    expect(store.listClasses()).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Tests laufen lassen**

Run: `cd frontend && npm test -- store`
Expected: 5 passed.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/store.js frontend/src/lib/store.test.js
git commit -m "feat: add client store with class/student/rule CRUD + persistence"
```

---

## Task 5: Store — Zimmer, Bilder, Generate, Export/Import

**Files:**
- Modify: `frontend/src/lib/store.js`
- Modify: `frontend/src/lib/store.test.js`

- [ ] **Step 1: Zimmer-/Bild-/Generate-/Export-Funktionen ergänzen**

Am Ende von `frontend/src/lib/store.js` anhängen:
```js
// ── Zimmer ──
export function listRooms() {
  return state.rooms.map(r => ({
    id: r.id, name: r.name,
    seatCount: r.seats.length,
    hasAreas: r.areas.length > 0,
    areaCount: r.areas.length,
    floorplan_image_path: r.floorplan_image_path,
    image_width: r.image_width, image_height: r.image_height,
  }));
}

export function getRoom(id) {
  const r = state.rooms.find(x => x.id === id);
  if (!r) return null;
  return {
    id: r.id, name: r.name,
    floorplan_image_path: r.floorplan_image_path,
    image_width: r.image_width, image_height: r.image_height,
    seats: r.seats.map(s => ({ ...s })),
    areas: [...r.areas].sort((a, b) => a.sort_order - b.sort_order).map(a => ({ ...a })),
  };
}

export async function createRoom({ name }) {
  const r = { id: uid(), name: name || 'Neues Zimmer', floorplan_image_path: null, image_width: 0, image_height: 0, seats: [], areas: [] };
  state.rooms.push(r);
  await persist();
  return { id: r.id, name: r.name };
}

export async function updateRoom(id, { name }) {
  const r = state.rooms.find(x => x.id === id);
  if (r) { r.name = name; await persist(); }
  return r ? { id: r.id, name: r.name } : null;
}

export async function deleteRoom(id) {
  const r = state.rooms.find(x => x.id === id);
  if (r?.floorplan_image_path) await deleteImage(r.floorplan_image_path);
  state.rooms = state.rooms.filter(x => x.id !== id);
  await persist();
}

// areas: [{name,color,sort_order,x_pos,y_pos,width_pct,height_pct}] → liefert mit ids
export async function saveAreas(roomId, areas) {
  const r = state.rooms.find(x => x.id === roomId);
  if (!r) return [];
  r.areas = areas.map((a, i) => ({ id: uid(), name: a.name, color: a.color, sort_order: i,
    x_pos: a.x_pos, y_pos: a.y_pos, width_pct: a.width_pct, height_pct: a.height_pct }));
  await persist();
  return r.areas.map(a => ({ ...a }));
}

// seats: [{seat_number,x_position,y_position,area_id}]
export async function saveSeats(roomId, seats) {
  const r = state.rooms.find(x => x.id === roomId);
  if (!r) return;
  r.seats = seats.map(s => ({ id: uid(), seat_number: s.seat_number, x_position: s.x_position, y_position: s.y_position, area_id: s.area_id ?? null }));
  await persist();
}

async function imageDimensions(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally { URL.revokeObjectURL(url); }
}

export async function setFloorplan(roomId, blob) {
  const r = state.rooms.find(x => x.id === roomId);
  if (!r) return null;
  if (r.floorplan_image_path) await deleteImage(r.floorplan_image_path);
  const imageId = uid();
  await putImage(imageId, blob);
  const dim = await imageDimensions(blob);
  r.floorplan_image_path = imageId;
  r.image_width = dim.width; r.image_height = dim.height;
  await persist();
  return getRoom(roomId);
}

export async function removeFloorplan(roomId) {
  const r = state.rooms.find(x => x.id === roomId);
  if (!r) return null;
  if (r.floorplan_image_path) await deleteImage(r.floorplan_image_path);
  r.floorplan_image_path = null; r.image_width = 0; r.image_height = 0;
  r.seats = []; r.areas = [];
  await persist();
  return getRoom(roomId);
}

const urlCache = new Map();
export async function getImageUrl(imageId) {
  if (!imageId) return null;
  if (urlCache.has(imageId)) return urlCache.get(imageId);
  const blob = await getImage(imageId);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(imageId, url);
  return url;
}

// ── Generieren ──
export function generate({ classId, roomId, fillMode, personsPerArea }) {
  const c = state.classes.find(x => x.id === classId);
  const r = state.rooms.find(x => x.id === roomId);
  if (!c) throw new Error('Klasse nicht gefunden');
  if (!r) throw new Error('Zimmer nicht gefunden');
  if (r.seats.length === 0) throw new Error('Das Zimmer hat noch keine Sitzplätze');
  if (c.students.length > r.seats.length) {
    throw new Error(`Zu wenig Plätze: ${c.students.length} Lernende, aber nur ${r.seats.length} Plätze`);
  }
  const result = generateSeatingPlan(
    [...c.students].sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [...r.seats].sort((a, b) => a.seat_number - b.seat_number),
    c.rules,
    { areas: [...r.areas].sort((a, b) => a.sort_order - b.sort_order), fillMode: fillMode || 'sequential', personsPerArea: parseInt(personsPerArea) || 0 }
  );
  return {
    ...result,
    room: { id: r.id, name: r.name, floorplan_image_path: r.floorplan_image_path, image_width: r.image_width, image_height: r.image_height },
    areas: [...r.areas].sort((a, b) => a.sort_order - b.sort_order),
  };
}
```

- [ ] **Step 2: Tests ergänzen**

Am Ende von `frontend/src/lib/store.test.js` anhängen:
```js
describe('room store', () => {
  it('creates room, saves areas and seats with ids', async () => {
    const r = await store.createRoom({ name: 'Zi 1' });
    const areas = await store.saveAreas(r.id, [{ name: 'T1', color: '#000', x_pos: 0, y_pos: 0, width_pct: 20, height_pct: 20 }]);
    expect(areas[0].id).toBeTruthy();
    await store.saveSeats(r.id, [{ seat_number: 1, x_position: 5, y_position: 5, area_id: areas[0].id }]);
    expect(store.getRoom(r.id).seats).toHaveLength(1);
    expect(store.listRooms()[0].seatCount).toBe(1);
  });

  it('generates a plan from stored data', async () => {
    const c = await store.createClass({ name: '3a' });
    await store.addStudent(c.id, { name: 'Anna' });
    const r = await store.createRoom({ name: 'Zi 1' });
    await store.saveSeats(r.id, [{ seat_number: 1, x_position: 5, y_position: 5, area_id: null }]);
    const res = store.generate({ classId: c.id, roomId: r.id, fillMode: 'sequential' });
    expect(res.success).toBe(true);
    expect(res.assignments.filter(a => a.student)).toHaveLength(1);
  });

  it('throws when too few seats', async () => {
    const c = await store.createClass({ name: '3a' });
    await store.addStudent(c.id, { name: 'Anna' });
    await store.addStudent(c.id, { name: 'Ben' });
    const r = await store.createRoom({ name: 'Zi 1' });
    await store.saveSeats(r.id, [{ seat_number: 1, x_position: 5, y_position: 5, area_id: null }]);
    expect(() => store.generate({ classId: c.id, roomId: r.id })).toThrow(/Zu wenig/);
  });
});
```

- [ ] **Step 3: Tests laufen lassen**

Run: `cd frontend && npm test -- store`
Expected: 8 passed.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/store.js frontend/src/lib/store.test.js
git commit -m "feat: add room/image/generate functions to client store"
```

---

## Task 6: Export/Import im Store

Export-Format kompatibel zu heute (`type: "sitzmix-export"`), `version: 2`, Bilder als Base64 inline. Import liest v1 (ohne Bilder) und v2.

**Files:**
- Create: `frontend/src/lib/exportImport.js`
- Create: `frontend/src/lib/exportImport.test.js`

- [ ] **Step 1: Implementieren**

Create `frontend/src/lib/exportImport.js`:
```js
import { getState } from './store';
import { getImage } from './db';
import * as store from './store';

function blobToDataUrl(blob) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/:(.*?);/)[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function buildExport({ classIds = [], roomIds = [] }) {
  const state = getState();
  const classes = state.classes.filter(c => classIds.includes(c.id)).map(c => {
    const byId = new Map(c.students.map(s => [s.id, s]));
    return {
      name: c.name,
      students: c.students.map(s => ({ name: s.name, color: s.color })),
      rules: c.rules.map(r => ({ studentA: byId.get(r.student_a_id)?.name, studentB: byId.get(r.student_b_id)?.name }))
        .filter(r => r.studentA && r.studentB),
    };
  });
  const rooms = [];
  for (const r of state.rooms.filter(r => roomIds.includes(r.id))) {
    const areaName = new Map(r.areas.map(a => [a.id, a.name]));
    let image = null;
    if (r.floorplan_image_path) {
      const blob = await getImage(r.floorplan_image_path);
      if (blob) image = await blobToDataUrl(blob);
    }
    rooms.push({
      name: r.name, image_width: r.image_width, image_height: r.image_height, image,
      areas: [...r.areas].sort((a, b) => a.sort_order - b.sort_order).map(a => ({
        name: a.name, color: a.color, sort_order: a.sort_order, x_pos: a.x_pos, y_pos: a.y_pos, width_pct: a.width_pct, height_pct: a.height_pct,
      })),
      seats: [...r.seats].sort((a, b) => a.seat_number - b.seat_number).map(s => ({
        seat_number: s.seat_number, x_position: s.x_position, y_position: s.y_position,
        area_name: s.area_id ? (areaName.get(s.area_id) || null) : null,
      })),
    });
  }
  return { type: 'sitzmix-export', version: 2, exportedAt: new Date().toISOString(), classes, rooms };
}

export function validateImport(data) {
  if (!data || data.type !== 'sitzmix-export' || !data.version) return 'Ungültiges Dateiformat. Erwartet: SitzMix-Export.';
  if (data.version > 2) return `Version ${data.version} wird nicht unterstützt.`;
  return null;
}

function uniqueName(name, existing) {
  return existing.some(n => n === name) ? `${name} (Import)` : name;
}

export async function applyImport(data) {
  const summary = { classes: 0, students: 0, rules: 0, rooms: 0, seats: 0, areas: 0 };
  for (const cls of (data.classes || [])) {
    const name = uniqueName(cls.name, store.listClasses().map(c => c.name));
    const created = await store.createClass({ name });
    const nameToId = new Map();
    for (const s of (cls.students || [])) {
      const st = await store.addStudent(created.id, { name: s.name });
      if (s.color) { st.color = s.color; }
      nameToId.set(s.name, st.id);
      summary.students++;
    }
    // Farben aus Datei übernehmen
    const full = store.getClass(created.id);
    full.students.forEach(st => { const src = (cls.students || []).find(x => x.name === st.name); if (src?.color) st.color = src.color; });
    for (const r of (cls.rules || [])) {
      const a = nameToId.get(r.studentA), b = nameToId.get(r.studentB);
      if (a && b) { await store.addRule(created.id, { studentAId: a, studentBId: b }); summary.rules++; }
    }
    summary.classes++;
  }
  for (const room of (data.rooms || [])) {
    const name = uniqueName(room.name, store.listRooms().map(r => r.name));
    const created = await store.createRoom({ name });
    await store.updateRoom(created.id, { name });
    const savedAreas = await store.saveAreas(created.id, (room.areas || []).map(a => ({
      name: a.name, color: a.color || '#C4B5FD', x_pos: a.x_pos ?? 20, y_pos: a.y_pos ?? 20, width_pct: a.width_pct ?? 20, height_pct: a.height_pct ?? 20,
    })));
    summary.areas += savedAreas.length;
    const areaByName = new Map(savedAreas.map(a => [a.name, a.id]));
    await store.saveSeats(created.id, (room.seats || []).map(s => ({
      seat_number: s.seat_number, x_position: s.x_position, y_position: s.y_position,
      area_id: s.area_name ? (areaByName.get(s.area_name) || null) : null,
    })));
    summary.seats += (room.seats || []).length;
    if (room.image) { await store.setFloorplan(created.id, dataUrlToBlob(room.image)); }
    summary.rooms++;
  }
  await store.saveSnapshotNow?.();
  return summary;
}
```

Note: `store.addRule` setzt `student_*` korrekt; die Farb-Übernahme schreibt direkt ins State-Objekt und wird durch nachfolgende `saveAreas`/`createRoom`-`persist()`-Aufrufe bzw. den finalen Snapshot mitgespeichert. Zur Sicherheit am Ende explizit persistieren: in `store.js` `export async function saveSnapshotNow(){ await persist(); }` ergänzen.

- [ ] **Step 2: `saveSnapshotNow` in store.js ergänzen**

In `frontend/src/lib/store.js` nach `loadFromDb` hinzufügen:
```js
export async function saveSnapshotNow() { await persist(); }
```

- [ ] **Step 3: Tests schreiben**

Create `frontend/src/lib/exportImport.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest';
import * as store from './store';
import { buildExport, validateImport, applyImport } from './exportImport';

beforeEach(async () => {
  await new Promise((res) => { const r = indexedDB.deleteDatabase('sitzmix'); r.onsuccess = r.onerror = () => res(); });
  store._setState({ schemaVersion: 2, classes: [], rooms: [] });
});

describe('export/import', () => {
  it('round-trips a class with rules', async () => {
    const c = await store.createClass({ name: '3a' });
    const a = await store.addStudent(c.id, { name: 'Anna' });
    const b = await store.addStudent(c.id, { name: 'Ben' });
    await store.addRule(c.id, { studentAId: a.id, studentBId: b.id });
    const data = await buildExport({ classIds: [c.id], roomIds: [] });
    expect(data.version).toBe(2);

    store._setState({ schemaVersion: 2, classes: [], rooms: [] });
    const summary = await applyImport(data);
    expect(summary.classes).toBe(1);
    expect(summary.rules).toBe(1);
    expect(store.getClass(store.listClasses()[0].id).students).toHaveLength(2);
  });

  it('accepts v1 and rejects v3', () => {
    expect(validateImport({ type: 'sitzmix-export', version: 1 })).toBeNull();
    expect(validateImport({ type: 'sitzmix-export', version: 3 })).toMatch(/nicht unterstützt/);
    expect(validateImport({ type: 'x' })).toMatch(/Ungültiges/);
  });

  it('suffixes duplicate class names on import', async () => {
    await store.createClass({ name: '3a' });
    await applyImport({ type: 'sitzmix-export', version: 2, classes: [{ name: '3a', students: [], rules: [] }], rooms: [] });
    expect(store.listClasses().map(c => c.name).sort()).toEqual(['3a', '3a (Import)']);
  });
});
```

- [ ] **Step 4: Tests laufen lassen**

Run: `cd frontend && npm test -- exportImport`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/exportImport.js frontend/src/lib/store.js frontend/src/lib/exportImport.test.js
git commit -m "feat: add JSON export/import (v2 with inline images, v1 read)"
```

---

## Task 7: Store-Provider + Seed-Daten + Persistent Storage

**Files:**
- Create: `frontend/public/default-floorplan.png` (Kopie des alten Default-Bilds)
- Create: `frontend/src/lib/seedData.js`
- Create: `frontend/src/store/StoreProvider.jsx`
- Modify: `frontend/src/main.jsx`

- [ ] **Step 1: Default-Grundrissbild bündeln**

Das alte Seed-Bild aus `database/seed/` (Dateiname `default-zimmer-201.png`, siehe `database/seed/`) nach `frontend/public/default-floorplan.png` kopieren.

Run:
```bash
cp database/seed/*.png frontend/public/default-floorplan.png
```
(Falls mehrere/anderer Name: die vorhandene PNG aus `database/seed/` verwenden.)

- [ ] **Step 2: Seed-Funktion**

Create `frontend/src/lib/seedData.js` — legt beim allerersten Start die Beispielklasse (24 Lernende, 2 Regeln) und das Beispielzimmer (6 Tische, 24 Sitze, Default-Grundriss) an. Verwende die exakten Daten aus `database/init.sql` (Namen/Farben/Positionen). Struktur:
```js
import * as store from './store';

const STUDENTS = [
  ['AMMANN Lea','#FFB3BA'],['BRUNNER Tim','#FFDFBA'],['FISCHER Lara','#FFFFBA'],['GERBER Noah','#BAFFC9'],
  ['HUBER Elena','#BAE1FF'],['KELLER Jan','#E8BAFF'],['LANG Sophie','#FFB3E6'],['MEIER Lukas','#B3FFE6'],
  ['MUELLER Anna','#FFE6B3'],['NGUYEN Mia','#B3D4FF'],['PETER Elias','#D4FFB3'],['RENNER Nora','#FFB3B3'],
  ['SCHMID David','#FFB3BA'],['STEINER Lina','#FFDFBA'],['TANNER Ben','#FFFFBA'],['WAGNER Julia','#BAFFC9'],
  ['WEBER Marco','#BAE1FF'],['ZIMMERMANN Sara','#E8BAFF'],['BIANCHI Luca','#FFD4BA'],['DIETRICH Nina','#BAF0FF'],
  ['EGGER Fiona','#E0BAFF'],['HARTMANN Leo','#BAFFDA'],['KOCH Mila','#FFE0BA'],['ROTH Samuel','#BACCFF'],
];
const AREAS = [
  ['Tisch 1','#C4B5FD',6,10,20,24],['Tisch 2','#93C5FD',30,10,20,24],['Tisch 3','#86EFAC',52,10,20,24],
  ['Tisch 4','#FCA5A5',6,44,20,24],['Tisch 5','#FDBA74',30,44,20,24],['Tisch 6','#FDE68A',52,44,20,24],
];
// seat_number → [x,y, areaIndex(0-based)]
const SEATS = [
  [12,16,0],[20,16,0],[12,28,0],[20,28,0], [36,16,1],[44,16,1],[36,28,1],[44,28,1],
  [58,16,2],[66,16,2],[58,28,2],[66,28,2], [12,50,3],[20,50,3],[12,62,3],[20,62,3],
  [36,50,4],[44,50,4],[36,62,4],[44,62,4], [58,50,5],[66,50,5],[58,62,5],[66,62,5],
];

export async function seedIfEmpty() {
  const state = store.getState();
  if (state.classes.length > 0 || state.rooms.length > 0) return false;

  const cls = await store.createClass({ name: 'Beispielklasse 3a' });
  const ids = [];
  for (const [name] of STUDENTS) { const s = await store.addStudent(cls.id, { name }); ids.push(s.id); }
  // Farben exakt setzen
  const full = store.getClass(cls.id);
  full.students.forEach((s, i) => { s.color = STUDENTS[i][1]; });
  // Regeln: (Lea↔Tim)=Index 0↔1, (Elena↔Jan)=Index 4↔5
  await store.addRule(cls.id, { studentAId: ids[0], studentBId: ids[1] });
  await store.addRule(cls.id, { studentAId: ids[4], studentBId: ids[5] });

  const room = await store.createRoom({ name: 'Zimmer 201' });
  const savedAreas = await store.saveAreas(room.id, AREAS.map(([name,color,x,y,w,h]) => ({ name, color, x_pos:x, y_pos:y, width_pct:w, height_pct:h })));
  await store.saveSeats(room.id, SEATS.map(([x,y,ai], i) => ({ seat_number: i+1, x_position:x, y_position:y, area_id: savedAreas[ai].id })));

  // Default-Bild laden und als Blob ablegen
  try {
    const resp = await fetch('/default-floorplan.png');
    if (resp.ok) await store.setFloorplan(room.id, await resp.blob());
  } catch { /* ohne Bild weiter */ }

  await store.saveSnapshotNow();
  return true;
}
```

- [ ] **Step 3: StoreProvider**

Create `frontend/src/store/StoreProvider.jsx`:
```js
import { createContext, useContext, useEffect, useState } from 'react';
import * as store from '../lib/store';
import { requestPersistentStorage } from '../lib/db';
import { seedIfEmpty } from '../lib/seedData';

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

export default function StoreProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [, forceTick] = useState(0);

  useEffect(() => {
    (async () => {
      await store.loadFromDb();
      await seedIfEmpty();
      requestPersistentStorage();
      setReady(true);
    })();
  }, []);

  const refresh = () => forceTick(t => t + 1);

  if (!ready) return <div className="text-center py-16 text-gray-500">Laden...</div>;
  return <StoreContext.Provider value={{ ...store, refresh }}>{children}</StoreContext.Provider>;
}
```

- [ ] **Step 4: Provider einhängen**

In `frontend/src/main.jsx` `App` mit `StoreProvider` umschliessen:
```js
import StoreProvider from './store/StoreProvider';
// ...
  <BrowserRouter>
    <StoreProvider>
      <App />
    </StoreProvider>
  </BrowserRouter>
```

- [ ] **Step 5: Build-Check**

Run: `cd frontend && npm run build`
Expected: Build erfolgreich (noch nutzen die Komponenten axios — das ändern die nächsten Tasks; Build muss trotzdem grün sein).

- [ ] **Step 6: Commit**

```bash
git add frontend/public/default-floorplan.png frontend/src/lib/seedData.js frontend/src/store/StoreProvider.jsx frontend/src/main.jsx
git commit -m "feat: add store provider, first-run seed data, persistent storage"
```

---

## Task 8: Komponenten auf Store umstellen — Settings-Modals

Mapping axios → Store für `ExportModal.jsx` und `ImportModal.jsx`.

**Files:**
- Modify: `frontend/src/components/settings/ExportModal.jsx`
- Modify: `frontend/src/components/settings/ImportModal.jsx`

- [ ] **Step 1: ExportModal umstellen**

- `import api from '../../api/client';` entfernen; `import { useStore } from '../../store/StoreProvider';` + `import { buildExport } from '../../lib/exportImport';`.
- `const { listClasses, listRooms } = useStore();`
- `useEffect`: `setClasses(listClasses()); setRooms(listRooms());` (synchron, kein Promise).
- `handleExport`: statt `api.get('/export', {params})`:
  ```js
  const data = await buildExport({ classIds: [...selectedClassIds], roomIds: [...selectedRoomIds] });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  ```
  Rest (Download-Link) bleibt.
- `cls.studentCount` bleibt gültig (von `listClasses`). `room.seatCount` ebenfalls.

- [ ] **Step 2: ImportModal umstellen**

- axios-Import entfernen; `import { useStore } from '../../store/StoreProvider';` + `import { validateImport, applyImport } from '../../lib/exportImport';`.
- `const { refresh } = useStore();`
- `handleFileChange`: Versionsprüfung über `validateImport(data)` statt `data.version > 1` (damit v2 akzeptiert wird):
  ```js
  const err = validateImport(data);
  if (err) { setError(err); return; }
  setFileData(data); setStep('preview');
  ```
- `handleImport`:
  ```js
  setStep('importing');
  try {
    const imported = await applyImport(fileData);
    setResult(imported);
    refresh();
    setStep('done');
  } catch (e) { setError(e.message || 'Import fehlgeschlagen.'); setStep('preview'); }
  ```
- Den Hinweis „Grundrissbilder werden nicht importiert…" entfernen (v2 importiert Bilder).

- [ ] **Step 3: Build-Check**

Run: `cd frontend && npm run build`
Expected: erfolgreich.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/settings
git commit -m "refactor: wire export/import modals to client store"
```

---

## Task 9: Komponenten auf Store umstellen — Klassen

**Files:**
- Modify: `frontend/src/components/classes/ClassListPage.jsx`
- Modify: `frontend/src/components/classes/ClassEditPage.jsx`

- [ ] **Step 1: ClassListPage**

- axios-Import raus; `const { listClasses, createClass, deleteClass } = useStore();`.
- `loadClasses`: `setClasses(listClasses()); setLoading(false);` (synchron).
- `handleCreate`: `const c = await createClass({ name: 'Neue Klasse' }); navigate('/classes/'+c.id);`
- `handleDelete`: `await deleteClass(id); setClasses(listClasses());`

- [ ] **Step 2: ClassEditPage**

Mapping (alle `await`):
- `loadClass`: `const data = getClass(id);` (synchron) — `if(!data){showToast('Fehler beim Laden','error');return;}` dann `setName/setStudents/setRules/setClassId` wie gehabt.
- `handleSave` (neu): `if (isNew && !classId) { const c = await createClass({name}); setClassId(c.id); navigate('/classes/'+c.id,{replace:true}); } else { await updateClass(classId,{name}); }` — Rest (Toast/Dirty) bleibt.
- `addStudent`: `const s = await addStudent(classId,{name:newStudentName.trim()}); setStudents(x=>[...x,s]);`
- `bulkImport`: `const arr = await bulkAddStudents(classId, bulkText); setStudents(x=>[...x,...arr]);`
- `deleteStudent`: `await deleteStudent(studentId); setStudents(...); setRules(r=>r.filter(rule=>rule.student_a_id!==studentId && rule.student_b_id!==studentId));`
- `addRule`: `studentAId`/`studentBId` sind jetzt UUID-Strings → **`parseInt` entfernen**, direkt `ruleA`/`ruleB` übergeben: `const r = await addRule(classId,{studentAId:ruleA,studentBId:ruleB}); setRules(x=>[...x,r]);` Fehler via `catch(e){ showToast(e.message,'error'); }`.
- `deleteRule`: `await deleteRule(ruleId); setRules(...)`.
- Hook: `const { getClass, createClass, updateClass, addStudent, bulkAddStudents, deleteStudent, addRule, deleteRule } = useStore();`
- **Wichtig:** Im Rule-Select `value={s.id}` bleibt; aber Vergleich `s.id !== parseInt(ruleA)` → `s.id !== ruleA` (String). Und `ruleA === ruleB`-Check bleibt gültig.

- [ ] **Step 3: Build-Check**

Run: `cd frontend && npm run build`
Expected: erfolgreich.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/classes
git commit -m "refactor: wire class pages to client store (uuid ids)"
```

---

## Task 10: Komponenten auf Store umstellen — Zimmer + Bild-URLs

**Files:**
- Modify: `frontend/src/components/rooms/RoomListPage.jsx`
- Modify: `frontend/src/components/rooms/RoomEditPage.jsx`

- [ ] **Step 1: RoomListPage**

Analog ClassListPage: `const { listRooms, createRoom, deleteRoom } = useStore();`; `loadRooms`→`setRooms(listRooms())`; `handleCreate`→`createRoom`; `handleDelete`→`await deleteRoom(id); setRooms(listRooms())`.

- [ ] **Step 2: RoomEditPage — Datenfluss**

- Hook: `const { getRoom, createRoom, updateRoom, saveAreas, saveSeats, setFloorplan, removeFloorplan, getImageUrl } = useStore();`
- `loadRoom`: `const data = getRoom(id); if(!data){...} setRoom(data); setName(...); setSeats(data.seats); setAreas(data.areas); setRoomId(data.id);`
- `handleSave` (else-Zweig): UUIDs statt Index-Mapping —
  ```js
  await updateRoom(roomId, { name });
  const savedAreas = await saveAreas(roomId, areas.map(a => ({ name:a.name, color:a.color, x_pos:a.x_pos, y_pos:a.y_pos, width_pct:a.width_pct, height_pct:a.height_pct })));
  const areaIdMap = new Map();
  areas.forEach((la, i) => { if (savedAreas[i]) areaIdMap.set(la.id, savedAreas[i].id); });
  await saveSeats(roomId, seats.map((s, i) => ({ seat_number: i+1, x_position:s.x_position, y_position:s.y_position, area_id: s.area_id ? (areaIdMap.get(s.area_id) || null) : null })));
  const data = getRoom(roomId); setRoom(data); setSeats(data.seats); setAreas(data.areas);
  if (activeAreaId) setActiveAreaId(areaIdMap.get(activeAreaId) || null);
  ```
  `tempIdCounter` bleibt für lokale Area-IDs vor dem Speichern; `addArea`/`handleAddAreaFromMap` unverändert.
- `handleUpload`: `const data = await setFloorplan(roomId, file); setRoom(data);` (kein FormData mehr).
- `handleRemoveImage`: `const data = await removeFloorplan(roomId); setRoom(data); setSeats([]); setAreas([]);`

- [ ] **Step 3: RoomEditPage — Bild-URL**

`SeatPlacer` braucht eine echte URL. Vor dem Render die Object-URL auflösen:
```js
const [imageUrl, setImageUrl] = useState(null);
useEffect(() => {
  let active = true;
  if (room?.floorplan_image_path) getImageUrl(room.floorplan_image_path).then(u => { if (active) setImageUrl(u); });
  else setImageUrl(null);
  return () => { active = false; };
}, [room?.floorplan_image_path]);
```
Im JSX `imageUrl={`/api/uploads/${room.floorplan_image_path}`}` → `imageUrl={imageUrl}`. Bedingung `room?.floorplan_image_path` bleibt als Gate.

- [ ] **Step 4: Build-Check**

Run: `cd frontend && npm run build`
Expected: erfolgreich.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/rooms
git commit -m "refactor: wire room pages + image blobs to client store"
```

---

## Task 11: GeneratorPage auf Store umstellen

**Files:**
- Modify: `frontend/src/components/generator/GeneratorPage.jsx`

- [ ] **Step 1: Daten + Generate**

- Hook: `const { listClasses, listRooms, generate, getImageUrl } = useStore();`
- `useEffect`: `setClasses(listClasses()); setRooms(listRooms());`
- `selectedRoomHasAreas`: Vergleich `r.id === parseInt(selectedRoom)` → `r.id === selectedRoom` (UUID-String). Ebenso in `handleClassChange`/`handleRoomChange` `parseInt` entfernen.
- `generate`:
  ```js
  try {
    const payload = { classId: selectedClass, roomId: selectedRoom };
    if (selectedRoomHasAreas && fillMode === 'per_area') { payload.fillMode='per_area'; payload.personsPerArea=personsPerArea; }
    const res = generate(payload);          // synchron, kann throwen
    setResult(res);
    if (res.warning) showToast(res.warning, 'warning');
  } catch (e) { showToast(e.message || 'Fehler beim Generieren', 'error'); }
  ```
- `SearchableSelect` options: `value: c.id` (String) — unverändert; nur die `parseInt`-Vergleiche oben anpassen.

- [ ] **Step 2: Bild-URL im Plan**

Object-URL für das Grundrissbild auflösen:
```js
const [planImageUrl, setPlanImageUrl] = useState(null);
useEffect(() => {
  let active = true;
  const id = result?.room?.floorplan_image_path;
  if (id) getImageUrl(id).then(u => { if (active) setPlanImageUrl(u); });
  else setPlanImageUrl(null);
  return () => { active = false; };
}, [result?.room?.floorplan_image_path]);
```
In `renderSeatingPlan` beide `src={`/api/uploads/${result.room.floorplan_image_path}`}` → `src={planImageUrl}` und die Bedingung `result.room.floorplan_image_path ?` → `planImageUrl ?`.

- [ ] **Step 3: Build- und Testlauf**

Run: `cd frontend && npm run build && npm test`
Expected: Build erfolgreich, alle Tests grün.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/generator
git commit -m "refactor: wire generator page to client store (browser-side generation)"
```

---

## Task 12: Altlasten entfernen

**Files:**
- Delete: `frontend/src/api/client.js`
- Modify: `frontend/vite.config.js`
- Modify: `frontend/package.json` (axios raus)
- Delete: `backend/`, `database/`

- [ ] **Step 1: Sicherstellen, dass kein `api/client` mehr importiert wird**

Run: `cd frontend && grep -rn "api/client" src || echo "clean"`
Expected: `clean`.

- [ ] **Step 2: Vite-Proxy entfernen**

In `frontend/vite.config.js` den `server.proxy`-Block für `/api` entfernen (gesamten `server`-Block, falls er nur den Proxy enthält).

- [ ] **Step 3: axios entfernen**

Run: `cd frontend && npm uninstall axios && rm src/api/client.js && rmdir src/api 2>/dev/null; true`

- [ ] **Step 4: Backend & Datenbank löschen**

Run:
```bash
rm -rf backend database
```

- [ ] **Step 5: Build + Test final**

Run: `cd frontend && npm run build && npm test`
Expected: Build erfolgreich, Tests grün.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove backend, database, axios and api proxy"
```

---

## Task 13: Docker auf statisches Nginx-Hosting umstellen

**Files:**
- Modify: `Dockerfile`
- Modify: `docker-compose.yml`
- Create: `nginx.conf`

- [ ] **Step 1: Dockerfile (Multi-Stage → Nginx)**

Replace `Dockerfile`:
```dockerfile
# Stage 1: Build des Frontends
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: statisches Hosting via Nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
```

- [ ] **Step 2: nginx.conf (SPA-Fallback)**

Create `nginx.conf`:
```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  # SPA: alle Routen auf index.html
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Statische Assets cachen
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

- [ ] **Step 3: docker-compose.yml (ein Service)**

Replace `docker-compose.yml`:
```yaml
services:
  sitzmix:
    build: .
    container_name: sitzmix
    ports:
      - "${SITZMIX_PORT:-8080}:80"
    restart: unless-stopped
```

- [ ] **Step 4: Lokaler Build-Test**

Run:
```bash
docker compose build
docker compose up -d
sleep 3 && curl -sf http://localhost:8080/ | head -c 100 && echo "  <-- OK"
docker compose down
```
Expected: HTML-Anfang (`<!doctype html>` o.ä.), kein Fehler.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile docker-compose.yml nginx.conf
git commit -m "feat: static nginx docker deployment (single container)"
```

---

## Task 14: `setup.sh` für den Server

**Files:**
- Create: `setup.sh`

- [ ] **Step 1: Skript schreiben**

Create `setup.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

# SitzMix Deployment-Setup
# Aufruf auf dem Server nach dem Kopieren des Projekts:  ./setup.sh
# Idempotent: erneuter Aufruf baut neu und aktualisiert die laufende Instanz.

PORT="${SITZMIX_PORT:-8080}"

echo "==> SitzMix Setup"

# Docker vorhanden?
if ! command -v docker >/dev/null 2>&1; then
  echo "FEHLER: Docker ist nicht installiert. Bitte Docker installieren: https://docs.docker.com/engine/install/" >&2
  exit 1
fi

# docker compose (v2) vorhanden?
if ! docker compose version >/dev/null 2>&1; then
  echo "FEHLER: 'docker compose' (v2) nicht verfügbar. Bitte Docker Compose Plugin installieren." >&2
  exit 1
fi

echo "==> Baue Image und starte Container (Port ${PORT})"
SITZMIX_PORT="${PORT}" docker compose up -d --build

echo "==> Status"
docker compose ps

echo ""
echo "Fertig. SitzMix läuft auf Port ${PORT}."
echo "Lokal erreichbar unter: http://localhost:${PORT}"
echo "Für sitzmix.ch: Reverse-Proxy (z.B. nginx/Caddy/Traefik) auf Port ${PORT} richten und TLS terminieren."
```

- [ ] **Step 2: Ausführbar machen + Syntax-Check**

Run:
```bash
chmod +x setup.sh && bash -n setup.sh && echo "syntax ok"
```
Expected: `syntax ok`.

- [ ] **Step 3: End-to-end via setup.sh**

Run:
```bash
./setup.sh
sleep 3 && curl -sf "http://localhost:${SITZMIX_PORT:-8080}/" >/dev/null && echo "reachable"
docker compose down
```
Expected: `reachable`.

- [ ] **Step 4: Commit**

```bash
git add setup.sh
git commit -m "feat: add setup.sh for server deployment"
```

---

## Task 15: README aktualisieren

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README an neue Architektur anpassen**

Anpassen: Tech-Stack-Tabelle (kein Backend/MariaDB/Sequelize; stattdessen IndexedDB, Nginx), „Schnellstart" auf `./setup.sh` bzw. `docker compose up -d --build`, Projektstruktur (kein `backend/`/`database/`, neue `lib/`/`store/`), API-Endpunkt-Tabelle entfernen, Datenschutz-Abschnitt ergänzen („alle Daten bleiben im Browser, Server speichert nichts"), Import/Export-Hinweis als Backup-Mechanismus. Algorithmus-Abschnitt bleibt inhaltlich gültig.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for client-side architecture"
```

---

## Self-Review (durchgeführt)

- **Spec-Abdeckung:** Datenmodell (T4/T5), IndexedDB (T3), Store/CRUD/Cascade (T4/T5), Bild-Handling als Blob + Object-URL (T5/T10/T11), Algorithmus im Browser (T2), Export/Import v1+v2 mit Base64-Bildern (T6), Persistent Storage + Seed + Hinweis (T7), Deployment Nginx + setup.sh (T13/T14), Tests (T1–T6), Cleanup (T12). Datenschutz-Hinweis-Banner: in T15/T7 abgedeckt (Provider + README); ein sichtbarer UI-Banner ist optional und kann in der Navbar ergänzt werden — siehe Hinweis unten.
- **Platzhalter:** keine offenen TBD/TODO; alle Codeblöcke konkret.
- **Typ-Konsistenz:** Store liefert `snake_case`-Shapes wie REST heute; IDs sind UUID-Strings → in betroffenen Komponenten wurden `parseInt`-Vergleiche explizit entfernt (T9/T10/T11).

**Offener kleiner Punkt (bewusst minimal gehalten):** Der Datenschutz-Hinweis „Daten liegen nur in diesem Browser" wird im README dokumentiert; ein dezenter UI-Banner kann zusätzlich in `Navbar.jsx` ergänzt werden. Falls gewünscht, als kleiner Zusatzschritt in Task 7 oder separat.
