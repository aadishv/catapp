import {
  CLIPTextModelWithProjection,
  AutoTokenizer,
  env,
  type PreTrainedModel,
  type PreTrainedTokenizer,
} from "@xenova/transformers";

env.allowLocalModels = false;
import type { WorkerMsg } from "../types";

const MODEL_ID = "Xenova/clip-vit-base-patch32";
const THRESHOLD = 0.28;
const DIM = 512;

let tokenizer: PreTrainedTokenizer | null = null;
let textModel: PreTrainedModel | null = null;
let vectors: Float32Array | null = null;
let photoIds: string[] | null = null;

const IDB_NAME = "catapp-vector";
const IDB_STORE = "index";
const IDB_KEY = "v1";

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(
  db: IDBDatabase,
  key: string,
): Promise<{ vectors: Float32Array; ids: string[] } | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE).objectStore(IDB_STORE).get(key);
    req.onsuccess = () =>
      resolve(req.result as { vectors: Float32Array; ids: string[] } | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(IDB_STORE, "readwrite")
      .objectStore(IDB_STORE)
      .put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function fetchWithProgress(
  url: string,
  onProgress: (pct: number) => void,
): Promise<ArrayBuffer> {
  const res = await fetch(url);
  const total = Number(res.headers.get("content-length") ?? 0);
  const reader = res.body!.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    if (total > 0) onProgress(Math.round((loaded / total) * 100));
  }
  const merged = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged.buffer;
}

async function init() {
  const modelBytes = { loaded: 0, total: 0 };
  const modelProgress = (p: { status: string; loaded?: number; total?: number }) => {
    if (p.status === "downloading" && p.total) {
      modelBytes.total = Math.max(modelBytes.total, p.total);
      modelBytes.loaded = p.loaded ?? 0;
      const pct = Math.round((modelBytes.loaded / modelBytes.total) * 100);
      self.postMessage({ type: "progress", stage: "model", percent: Math.min(pct, 99) } satisfies WorkerMsg);
    }
  };

  const [tok, model] = await Promise.all([
    AutoTokenizer.from_pretrained(MODEL_ID),
    CLIPTextModelWithProjection.from_pretrained(MODEL_ID, {
      quantized: true,
      progress_callback: modelProgress,
    }),
  ]);
  tokenizer = tok as PreTrainedTokenizer;
  textModel = model as PreTrainedModel;
  self.postMessage({ type: "progress", stage: "model", percent: 100 } satisfies WorkerMsg);

  const db = await openIdb();
  const cached = await idbGet(db, IDB_KEY);
  if (cached?.vectors && cached?.ids) {
    vectors = cached.vectors;
    photoIds = cached.ids;
    self.postMessage({ type: "progress", stage: "index", percent: 100 } satisfies WorkerMsg);
  } else {
    const vecBuf = await fetchWithProgress("/search-index/vectors.bin", (pct) => {
      self.postMessage({ type: "progress", stage: "index", percent: pct } satisfies WorkerMsg);
    });
    const ids: string[] = await fetch("/search-index/photo_ids.json").then((r) => r.json());
    vectors = new Float32Array(vecBuf);
    photoIds = ids;
    idbPut(db, IDB_KEY, { vectors, ids }).catch(() => {});
  }

  self.postMessage({ type: "ready", count: photoIds.length } satisfies WorkerMsg);
}

async function search(query: string, id: number) {
  if (!tokenizer || !textModel || !vectors || !photoIds) {
    throw new Error("Worker not initialized");
  }

  const t0 = performance.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputs = await (tokenizer as any)([query], { padding: true, truncation: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { text_embeds } = await (textModel as any)(inputs);
  const queryVec: Float32Array = text_embeds.data as Float32Array;
  const tEmbed = performance.now();

  const hits: Array<{ photo_id: string; score: number }> = [];
  const n = photoIds.length;
  for (let i = 0; i < n; i++) {
    const offset = i * DIM;
    let dot = 0;
    for (let j = 0; j < DIM; j++) {
      dot += (queryVec[j] ?? 0) * (vectors[offset + j] ?? 0);
    }
    if (dot >= THRESHOLD) {
      hits.push({ photo_id: photoIds[i]!, score: dot });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  const tSearch = performance.now();

  self.postMessage({
    type: "result",
    id,
    results: hits,
    timing: { embedMs: tEmbed - t0, searchMs: tSearch - tEmbed },
  } satisfies WorkerMsg);
}

self.addEventListener("message", async (e: MessageEvent<{ type: string; id?: number; query?: string }>) => {
  const { type, id, query } = e.data;
  try {
    if (type === "init") {
      await init();
    } else if (type === "search" && query !== undefined && id !== undefined) {
      await search(query, id);
    }
  } catch (err) {
    self.postMessage({ type: "error", id, message: String(err) } satisfies WorkerMsg);
  }
});
