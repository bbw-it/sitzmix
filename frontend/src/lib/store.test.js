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

describe('room store', () => {
  it('creates room, saves areas and seats with ids', async () => {
    const r = await store.createRoom({ name: 'Zi 1' });
    const areas = await store.saveAreas(r.id, [{ name: 'T1', color: '#000', x_pos: 0, y_pos: 0, width_pct: 20, height_pct: 20 }]);
    expect(areas[0].id).toBeTruthy();
    await store.saveSeats(r.id, [{ seat_number: 1, x_position: 5, y_position: 5, area_id: areas[0].id }]);
    expect(store.getRoom(r.id).seats).toHaveLength(1);
    expect(store.listRooms()[0].seatCount).toBe(1);
  });

  it('setSketch stores sketch and clears image reference', async () => {
    const r = await store.createRoom({ name: 'Zi' });
    const sketch = { version: 1, width: 1000, height: 700, shapes: [{ id: 'p1', type: 'polygon', points: [{x:0,y:0},{x:10,y:0},{x:10,y:10}] }] };
    const room = await store.setSketch(r.id, sketch);
    expect(room.floorplan_sketch.shapes).toHaveLength(1);
    expect(room.floorplan_image_path).toBeNull();
    expect(room.image_width).toBe(1000);
    expect(store.listRooms()[0].floorplan_sketch).toBeTruthy();
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

  it('excludes absent students from generation', async () => {
    const c = await store.createClass({ name: '3a' });
    const a = await store.addStudent(c.id, { name: 'Anna' });
    await store.addStudent(c.id, { name: 'Ben' });
    const r = await store.createRoom({ name: 'Zi 1' });
    await store.saveSeats(r.id, [
      { seat_number: 1, x_position: 5, y_position: 5, area_id: null },
      { seat_number: 2, x_position: 9, y_position: 9, area_id: null },
    ]);
    const res = store.generate({ classId: c.id, roomId: r.id, absentIds: [a.id] });
    const placed = res.assignments.filter(x => x.student);
    expect(placed).toHaveLength(1);
    expect(placed[0].student.name).toBe('Ben');
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
