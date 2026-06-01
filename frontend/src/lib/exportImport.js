import { getState, saveSnapshotNow } from './store';
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
      floorplan_sketch: r.floorplan_sketch || null,
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
      nameToId.set(s.name, st.id);
      summary.students++;
    }
    // Original-Farben aus der Datei übernehmen (addStudent vergibt sonst Default-Farben)
    const liveClass = getState().classes.find(c => c.id === created.id);
    for (const st of liveClass.students) {
      const src = (cls.students || []).find(x => x.name === st.name);
      if (src?.color) st.color = src.color;
    }
    for (const r of (cls.rules || [])) {
      const a = nameToId.get(r.studentA), b = nameToId.get(r.studentB);
      if (a && b) { await store.addRule(created.id, { studentAId: a, studentBId: b }); summary.rules++; }
    }
    summary.classes++;
  }

  for (const room of (data.rooms || [])) {
    const name = uniqueName(room.name, store.listRooms().map(r => r.name));
    const created = await store.createRoom({ name });
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
    if (room.floorplan_sketch) {
      await store.setSketch(created.id, room.floorplan_sketch);
    } else if (room.image) {
      await store.setFloorplan(created.id, dataUrlToBlob(room.image));
    }
    summary.rooms++;
  }

  await saveSnapshotNow();
  return summary;
}
