import * as store from './store';

// Beispieldaten für den allerersten Start (entspricht dem alten DB-Seed).
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
// [x, y, areaIndex (0-based)]
const SEATS = [
  [12,16,0],[20,16,0],[12,28,0],[20,28,0], [36,16,1],[44,16,1],[36,28,1],[44,28,1],
  [58,16,2],[66,16,2],[58,28,2],[66,28,2], [12,50,3],[20,50,3],[12,62,3],[20,62,3],
  [36,50,4],[44,50,4],[36,62,4],[44,62,4], [58,50,5],[66,50,5],[58,62,5],[66,62,5],
];

export async function seedIfEmpty() {
  const state = store.getState();
  if (state.classes.length > 0 || state.rooms.length > 0) return false;

  // runBatch: der komplette Seed wird mit einem einzigen Snapshot-Schreibvorgang
  // persistiert statt mit einem pro Lernendem/Zimmer.
  await store.runBatch(async () => {
    const cls = await store.createClass({ name: 'Beispielklasse 3a' });
    const ids = [];
    for (const [name] of STUDENTS) { const s = await store.addStudent(cls.id, { name }); ids.push(s.id); }
    // Farben exakt setzen
    const liveClass = store.getState().classes.find(c => c.id === cls.id);
    liveClass.students.forEach((s, i) => { s.color = STUDENTS[i][1]; });
    // Regeln: Lea↔Tim (0↔1), Elena↔Jan (4↔5)
    await store.addRule(cls.id, { studentAId: ids[0], studentBId: ids[1] });
    await store.addRule(cls.id, { studentAId: ids[4], studentBId: ids[5] });

    const room = await store.createRoom({ name: 'Zimmer 201' });
    const savedAreas = await store.saveAreas(room.id, AREAS.map(([name, color, x, y, w, h]) => ({ name, color, x_pos: x, y_pos: y, width_pct: w, height_pct: h })));
    await store.saveSeats(room.id, SEATS.map(([x, y, ai], i) => ({ seat_number: i + 1, x_position: x, y_position: y, area_id: savedAreas[ai].id })));

    // Default-Grundriss laden und als Blob ablegen
    try {
      const resp = await fetch('/default-floorplan.webp');
      if (resp.ok) await store.setFloorplan(room.id, await resp.blob());
    } catch { /* ohne Bild weiter */ }

    await store.saveSnapshotNow();
  });

  return true;
}
