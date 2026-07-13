// Belegt, dass runBatch() die Snapshot-Schreibvorgänge bündelt.
// Ohne diese Bündelung schreibt jede einzelne Mutation den vollständigen Snapshot
// (beim Seed 24 Lernende → 27+ Schreibvorgänge für einen einzigen Endzustand).
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./db', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, saveSnapshot: vi.fn(actual.saveSnapshot) };
});

import * as db from './db';
import * as store from './store';

beforeEach(async () => {
  await new Promise((res) => {
    const r = indexedDB.deleteDatabase('sitzmix');
    r.onsuccess = r.onerror = () => res();
  });
  store._setState({ schemaVersion: 2, classes: [], rooms: [] });
  db.saveSnapshot.mockClear();
});

describe('runBatch', () => {
  it('writes one snapshot per mutation when not batched', async () => {
    const c = await store.createClass({ name: '3a' });      // 1
    await store.addStudent(c.id, { name: 'Anna' });          // 2
    await store.addStudent(c.id, { name: 'Ben' });           // 3
    expect(db.saveSnapshot).toHaveBeenCalledTimes(3);
  });

  it('collapses a batch of mutations into a single write', async () => {
    await store.runBatch(async () => {
      const c = await store.createClass({ name: '3a' });
      for (const name of ['Anna', 'Ben', 'Cara', 'Dora', 'Emil']) {
        await store.addStudent(c.id, { name });
      }
    });
    expect(db.saveSnapshot).toHaveBeenCalledTimes(1);
  });

  it('persists the final state, so nothing is lost by batching', async () => {
    await store.runBatch(async () => {
      const c = await store.createClass({ name: '3a' });
      await store.addStudent(c.id, { name: 'Anna' });
    });
    store._setState({ schemaVersion: 2, classes: [], rooms: [] });
    await store.loadFromDb();
    expect(store.getClass(store.listClasses()[0].id).students).toHaveLength(1);
  });

  it('still writes when the batch throws, keeping DB and memory in sync', async () => {
    await expect(store.runBatch(async () => {
      await store.createClass({ name: 'Teil' });
      throw new Error('boom');
    })).rejects.toThrow('boom');
    expect(db.saveSnapshot).toHaveBeenCalledTimes(1);
  });

  it('flags an export as pending even inside a batch', async () => {
    store.acknowledgeExport();
    await store.runBatch(async () => { await store.createClass({ name: 'x' }); });
    expect(store.isExportPending()).toBe(true);
  });
});
