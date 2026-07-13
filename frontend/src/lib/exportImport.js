import { getState, saveSnapshotNow, runBatch } from './store';
import { getImage } from './db';
import * as store from './store';
import { getTheme, setTheme, isValidTheme, getCustomConfig, setCustomConfig, isValidHex } from './theme';

function blobToDataUrl(blob) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });
}

// Backup-Dateien sind Nutzereingaben: sie können beschädigt oder manipuliert sein.
// Darum wird jedes Bild strikt geparst und auf einen Bild-MIME-Typ eingegrenzt,
// statt einen beliebigen Typ (z.B. text/html) aus der Datei zu übernehmen.
const IMAGE_DATA_URL = /^data:([^;,]*);base64,([a-z0-9+/=\s]*)$/i;

function dataUrlToBlob(dataUrl) {
  const m = IMAGE_DATA_URL.exec(String(dataUrl ?? '').trim());
  if (!m) throw new Error('Das Grundriss-Bild im Backup ist beschädigt.');

  // Ältere Exporte konnten Blobs ohne MIME-Typ enthalten → als PNG behandeln.
  const mime = m[1] || 'image/png';
  if (!mime.startsWith('image/')) throw new Error(`Unerlaubter Bildtyp im Backup: ${mime}`);

  let bin;
  try { bin = atob(m[2].replace(/\s+/g, '')); }
  catch { throw new Error('Das Grundriss-Bild im Backup ist beschädigt (ungültige Base64-Daten).'); }

  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// Farben aus einer Backup-Datei sind ungeprüft. Sie landen in React-`style`-Attributen,
// wo sie zwar nicht ausbrechen können, aber ungültige Werte still verschluckt würden
// (Kreis ohne Farbe). Darum auf #rrggbb normalisieren, sonst Fallback.
function safeColor(color, fallback) {
  if (!isValidHex(color)) return fallback;
  const hex = color.trim();
  return (hex.startsWith('#') ? hex : `#${hex}`).toLowerCase();
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
  return { type: 'sitzmix-export', version: 2, exportedAt: new Date().toISOString(), theme: getTheme(), themeCustom: getCustomConfig(), classes, rooms };
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

  // Bilder zuerst dekodieren: ein beschädigtes Bild soll den Import ablehnen,
  // bevor irgendetwas angelegt wurde — statt eine halb importierte Datenbank zu
  // hinterlassen.
  const rooms = data.rooms || [];
  const roomBlobs = rooms.map(room => (room.image ? dataUrlToBlob(room.image) : null));

  // Alles in einem einzigen Snapshot-Schreibvorgang statt einem pro Lernendem.
  await runBatch(async () => {
    for (const cls of (data.classes || [])) {
      const name = uniqueName(cls.name, store.listClasses().map(c => c.name));
      const created = await store.createClass({ name });
      const nameToId = new Map();
      for (const s of (cls.students || [])) {
        const st = await store.addStudent(created.id, { name: s.name });
        nameToId.set(s.name, st.id);
        summary.students++;
      }
      // Original-Farben aus der Datei übernehmen (addStudent vergibt sonst Default-Farben).
      // Ungültige Werte behalten die Default-Farbe.
      const liveClass = getState().classes.find(c => c.id === created.id);
      const colorByName = new Map((cls.students || []).map(s => [s.name, s.color]));
      for (const st of liveClass.students) {
        st.color = safeColor(colorByName.get(st.name), st.color);
      }
      for (const r of (cls.rules || [])) {
        const a = nameToId.get(r.studentA), b = nameToId.get(r.studentB);
        if (a && b) { await store.addRule(created.id, { studentAId: a, studentBId: b }); summary.rules++; }
      }
      summary.classes++;
    }

    for (const [i, room] of rooms.entries()) {
      const name = uniqueName(room.name, store.listRooms().map(r => r.name));
      const created = await store.createRoom({ name });
      const savedAreas = await store.saveAreas(created.id, (room.areas || []).map(a => ({
        name: a.name, color: safeColor(a.color, '#c4b5fd'), x_pos: a.x_pos ?? 20, y_pos: a.y_pos ?? 20, width_pct: a.width_pct ?? 20, height_pct: a.height_pct ?? 20,
      })));
      summary.areas += savedAreas.length;
      const areaByName = new Map(savedAreas.map(a => [a.name, a.id]));
      await store.saveSeats(created.id, (room.seats || []).map(s => ({
        seat_number: s.seat_number, x_position: s.x_position, y_position: s.y_position,
        area_id: s.area_name ? (areaByName.get(s.area_name) || null) : null,
      })));
      summary.seats += (room.seats || []).length;
      if (roomBlobs[i]) await store.setFloorplan(created.id, roomBlobs[i]);
      summary.rooms++;
    }

    if (data.themeCustom) setCustomConfig(data.themeCustom);   // setCustomConfig validiert selbst
    if (data.theme && isValidTheme(data.theme)) setTheme(data.theme);

    await saveSnapshotNow();
  });

  return summary;
}
