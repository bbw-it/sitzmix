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
