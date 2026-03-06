import { createSignal } from "solid-js";
import type { VectorHit, VectorResult, WorkerMsg } from "../types";

export const [modelPercent, setModelPercent] = createSignal(0);
export const [indexPercent, setIndexPercent] = createSignal(0);
export const [loadStage, setLoadStage] = createSignal<"idle" | "model" | "index" | "ready">("idle");

/** Weighted progress: model = 70%, index = 30% */
export function loadPercent(): number {
  return Math.round(modelPercent() * 0.7 + indexPercent() * 0.3);
}

let worker: Worker | null = null;
let ready = false;
let readyPromise: Promise<void> | null = null;
let msgId = 0;
const pending = new Map<
  number,
  { resolve: (r: VectorResult) => void; reject: (e: Error) => void }
>();

export const vectorSearch = {
  get isReady() {
    return ready;
  },

  init(): Promise<void> {
    if (ready) return Promise.resolve();
    if (readyPromise) return readyPromise;

    setLoadStage("model");

    readyPromise = new Promise((resolve, reject) => {
      worker = new Worker(
        new URL("../workers/clip-search.worker.ts", import.meta.url),
        { type: "module" },
      );

      worker.addEventListener("message", (e: MessageEvent<WorkerMsg>) => {
        const msg = e.data;
        if (msg.type === "progress") {
          if (msg.stage === "model") {
            setModelPercent(msg.percent);
            setLoadStage("model");
          } else {
            setIndexPercent(msg.percent);
            setLoadStage("index");
          }
        } else if (msg.type === "ready") {
          setModelPercent(100);
          setIndexPercent(100);
          setLoadStage("ready");
          ready = true;
          resolve();
        } else if (msg.type === "result") {
          pending.get(msg.id)?.resolve({ results: msg.results, timing: msg.timing });
          pending.delete(msg.id);
        } else if (msg.type === "error") {
          const err = new Error(msg.message);
          if (msg.id !== undefined && pending.has(msg.id)) {
            pending.get(msg.id)!.reject(err);
            pending.delete(msg.id);
          } else {
            reject(err);
          }
        }
      });

      worker.addEventListener("error", (e) => reject(new Error(e.message)));
      worker.postMessage({ type: "init" });
    });

    return readyPromise;
  },

  search(query: string): Promise<VectorResult> {
    if (!worker || !ready) return Promise.reject(new Error("Worker not ready"));
    const id = ++msgId;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker!.postMessage({ type: "search", id, query });
    });
  },

  getHitIds(hits: VectorHit[]): Set<string> {
    return new Set(hits.map((h) => h.photo_id));
  },
};
