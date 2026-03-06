import type { Photo } from "../types";

const IDB_NAME = "catapp-vector";
const IDB_STORE = "index";
const KEY = "photo-index-v1";

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadPhotoIndex(): Promise<Photo[]> {
  // Try IDB cache first
  try {
    const db = await openIdb();
    const cached = await new Promise<Photo[] | undefined>((resolve, reject) => {
      const req = db.transaction(IDB_STORE).objectStore(IDB_STORE).get(KEY);
      req.onsuccess = () => resolve(req.result as Photo[] | undefined);
      req.onerror = () => reject(req.error);
    });
    if (cached) return cached;
  } catch {
    // IDB unavailable — fall through to network
  }

  const res = await fetch("/index.json");
  if (!res.ok) throw new Error(`${res.status}`);
  const photos = (await res.json()) as Photo[];

  // Persist for next load — fire and forget
  openIdb()
    .then((db) => {
      db.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).put(photos, KEY);
    })
    .catch(() => {});

  return photos;
}
