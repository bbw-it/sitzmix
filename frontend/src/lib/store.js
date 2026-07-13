import { getSnapshot, saveSnapshot, putImage, getImage, deleteImage } from './db';
import { generateSeatingPlan } from './seatingAlgorithm';

const PASTEL = ['#FFB3BA','#FFDFBA','#FFFFBA','#BAFFC9','#BAE1FF','#E8BAFF','#FFB3E6','#B3FFE6','#FFE6B3','#B3D4FF','#D4FFB3','#FFB3B3'];
const uid = () => crypto.randomUUID();

let state = { schemaVersion: 2, classes: [], rooms: [] };

export function _setState(s) { state = s; }            // nur für Tests/Provider
export function getState() { return state; }

// ── Export-Erinnerung ──────────────────────────────────────
// Nach jeder Daten-Mutation wird "Export ausstehend" gesetzt → der Hinweis-Banner
// erscheint wieder. Wegklicken oder Exportieren quittiert das.
const EXPORT_FLAG = 'sitzmix-export-pending';
const listeners = new Set();

// In-Memory ist die Wahrheit; localStorage nur zur Persistenz über Reloads hinweg.
let exportPending = true;
try { if (localStorage.getItem(EXPORT_FLAG) === '0') exportPending = false; } catch { /* ignore */ }

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify() { listeners.forEach(l => l()); }

export function isExportPending() { return exportPending; }

export function acknowledgeExport() {
  exportPending = false;
  try { localStorage.setItem(EXPORT_FLAG, '0'); } catch { /* ignore */ }
  notify();
}
function markExportPending() {
  exportPending = true;
  try { localStorage.setItem(EXPORT_FLAG, '1'); } catch { /* ignore */ }
  notify();
}

// ── Stapel-Schreiben ───────────────────────────────────────
// Jede Mutation schreibt sonst den vollständigen Snapshot. Beim Seed (24 Lernende)
// oder beim Import einer Klasse sind das dutzende Schreibvorgänge für einen einzigen
// Endzustand. runBatch() bündelt sie zu genau einem Schreibvorgang am Schluss.
let batchDepth = 0;
let batchDirty = false;

export async function runBatch(fn) {
  batchDepth++;
  try {
    return await fn();
  } finally {
    batchDepth--;
    // Auch im Fehlerfall schreiben, damit DB und In-Memory-Zustand nicht auseinanderlaufen.
    if (batchDepth === 0 && batchDirty) {
      batchDirty = false;
      await saveSnapshot(state);
    }
  }
}

async function persist() {
  markExportPending();
  if (batchDepth > 0) { batchDirty = true; return; }
  await saveSnapshot(state);
}

export async function loadFromDb() {
  const snap = await getSnapshot();
  if (snap && snap.classes && snap.rooms) state = snap;
  return state;
}

export async function saveSnapshotNow() { await persist(); }

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

export async function addStudent(classId, { name }) {
  const c = state.classes.find(x => x.id === classId);
  if (!c) return null;
  const s = { id: uid(), name, color: PASTEL[c.students.length % PASTEL.length] };
  c.students.push(s);
  await persist();
  return s;
}

export async function bulkAddStudents(classId, text) {
  const c = state.classes.find(x => x.id === classId);
  if (!c) return [];
  const names = text.split(/[\n,;]+/).map(n => n.trim()).filter(Boolean);
  const added = names.map(name => {
    const s = { id: uid(), name, color: PASTEL[c.students.length % PASTEL.length] };
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
  if (r?.floorplan_image_path) {
    await deleteImage(r.floorplan_image_path);
    releaseImageUrl(r.floorplan_image_path);
  }
  state.rooms = state.rooms.filter(x => x.id !== id);
  await persist();
}

// areas: [{name,color,x_pos,y_pos,width_pct,height_pct}] → liefert mit ids zurück
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
  if (r.floorplan_image_path) { await deleteImage(r.floorplan_image_path); releaseImageUrl(r.floorplan_image_path); }
  const imageId = uid();
  await putImage(imageId, blob);
  let dim = { width: 0, height: 0 };
  try { dim = await imageDimensions(blob); } catch { /* jsdom/headless: keine Dimensionen */ }
  r.floorplan_image_path = imageId;
  r.image_width = dim.width; r.image_height = dim.height;
  await persist();
  return getRoom(roomId);
}

export async function removeFloorplan(roomId) {
  const r = state.rooms.find(x => x.id === roomId);
  if (!r) return null;
  if (r.floorplan_image_path) { await deleteImage(r.floorplan_image_path); releaseImageUrl(r.floorplan_image_path); }
  r.floorplan_image_path = null; r.image_width = 0; r.image_height = 0;
  r.seats = []; r.areas = [];
  await persist();
  return getRoom(roomId);
}

// Object-URLs pro Bild einmal erzeugen und wiederverwenden. Wird ein Bild ersetzt
// oder gelöscht, muss die URL freigegeben werden — sonst hält der Browser den
// Blob (mehrere MB) bis zum Reload im Speicher.
const urlCache = new Map();

function releaseImageUrl(imageId) {
  const url = urlCache.get(imageId);
  if (url) { URL.revokeObjectURL(url); urlCache.delete(imageId); }
}

export async function getImageUrl(imageId) {
  if (!imageId) return null;
  if (urlCache.has(imageId)) return urlCache.get(imageId);
  const blob = await getImage(imageId);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(imageId, url);
  return url;
}

// ── Generieren (läuft vollständig im Browser) ──
export function generate({ classId, roomId, fillMode, personsPerArea, absentIds }) {
  const c = state.classes.find(x => x.id === classId);
  const r = state.rooms.find(x => x.id === roomId);
  if (!c) throw new Error('Klasse nicht gefunden');
  if (!r) throw new Error('Zimmer nicht gefunden');
  if (r.seats.length === 0) throw new Error('Das Zimmer hat noch keine Sitzplätze');
  const absent = new Set(absentIds || []);
  const present = c.students.filter(s => !absent.has(s.id));
  if (present.length > r.seats.length) {
    throw new Error(`Zu wenig Plätze: ${present.length} Lernende, aber nur ${r.seats.length} Plätze`);
  }
  const result = generateSeatingPlan(
    [...present].sort((a, b) => a.name.localeCompare(b.name, 'de')),
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
