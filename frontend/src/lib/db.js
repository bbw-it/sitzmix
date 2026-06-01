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
    const request = fn(os);
    t.oncomplete = () => { db.close(); resolve(request?.result); };
    t.onerror = () => { db.close(); reject(t.error); };
    t.onabort = () => { db.close(); reject(t.error); };
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

// Images are stored as { type, buffer:ArrayBuffer } rather than raw Blobs.
// This avoids cross-browser IndexedDB Blob quirks (e.g. older Safari) and
// round-trips reliably in the test environment.
export async function putImage(id, blob) {
  const buffer = await blob.arrayBuffer();
  const db = await openDb();
  return tx(db, STORE_IMAGES, 'readwrite', (os) => os.put({ type: blob.type, buffer }, id));
}

export async function getImage(id) {
  const db = await openDb();
  const rec = await tx(db, STORE_IMAGES, 'readonly', (os) => os.get(id));
  if (!rec) return undefined;
  return new Blob([rec.buffer], { type: rec.type });
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
