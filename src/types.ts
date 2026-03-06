export type Photo = {
  id: string;
  taken_at: string;
  title: string;
  w: number;
  h: number;
  thumb?: string;
  small?: string;
  medium?: string;
  original?: string;
  placeholder?: string;
};

export type VectorHit = { photo_id: string; score: number };
export type VectorTiming = { embedMs: number; searchMs: number };
export type VectorResult = { results: VectorHit[]; timing: VectorTiming };

export type WorkerMsg =
  | { type: "ready"; count: number }
  | { type: "progress"; stage: "model" | "index"; percent: number }
  | { type: "result"; id: number; results: VectorHit[]; timing: VectorTiming }
  | { type: "error"; id?: number; message: string };

/** Resolve a Lychee storage path to a full URL. */
export function photoUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  return `/uploads/${path}`;
}

export function placeholderDataUrl(b64: string | undefined): string | undefined {
  if (!b64) return undefined;
  return `data:image/webp;base64,${b64}`;
}
