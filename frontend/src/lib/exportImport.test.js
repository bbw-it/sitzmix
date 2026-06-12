import { describe, it, expect, beforeEach } from 'vitest';
import * as store from './store';
import { buildExport, validateImport, applyImport } from './exportImport';
import { setTheme, getTheme, _resetTheme } from './theme';

beforeEach(async () => {
  await new Promise((res) => { const r = indexedDB.deleteDatabase('sitzmix'); r.onsuccess = r.onerror = () => res(); });
  store._setState({ schemaVersion: 2, classes: [], rooms: [] });
  try { localStorage.removeItem('sitzmix-theme'); } catch { /* ignore */ }
  _resetTheme();
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

  it('round-trips a room with areas and seats', async () => {
    const r = await store.createRoom({ name: 'Zi' });
    const areas = await store.saveAreas(r.id, [{ name: 'T1', color: '#000', x_pos: 0, y_pos: 0, width_pct: 20, height_pct: 20 }]);
    await store.saveSeats(r.id, [{ seat_number: 1, x_position: 5, y_position: 5, area_id: areas[0].id }]);
    const data = await buildExport({ classIds: [], roomIds: [r.id] });
    expect(data.rooms[0].seats).toHaveLength(1);
    store._setState({ schemaVersion: 2, classes: [], rooms: [] });
    await applyImport(data);
    const imported = store.getRoom(store.listRooms()[0].id);
    expect(imported.seats).toHaveLength(1);
    expect(imported.areas).toHaveLength(1);
  });

  it('includes the chosen theme and restores it on import', async () => {
    setTheme('bern');
    const data = await buildExport({ classIds: [], roomIds: [] });
    expect(data.theme).toBe('bern');
    setTheme('winterthur');
    await applyImport(data);
    expect(getTheme()).toBe('bern');
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

  it('preserves student colors through round-trip', async () => {
    const c = await store.createClass({ name: '3a' });
    const data = await buildExport({ classIds: [c.id], roomIds: [] });
    data.classes[0].students.push({ name: 'Zoe', color: '#123456' });
    await applyImport(data);
    const imported = store.getClass(store.listClasses().find(x => x.name === '3a (Import)').id);
    expect(imported.students.find(s => s.name === 'Zoe').color).toBe('#123456');
  });
});
