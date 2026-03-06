import { createSignal, Show, createEffect } from "solid-js";
import {
  vectorSearch,
  loadStage,
  loadPercent,
} from "../services/vector-search";
import type { VectorHit } from "../types";

type Props = {
  onResults: (hits: VectorHit[] | null) => void;
};

export function SearchBar(props: Props) {
  const [query, setQuery] = createSignal("");
  const [searching, setSearching] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [workerStarted, setWorkerStarted] = createSignal(false);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const stage = loadStage;
  const pct = loadPercent;

  const stageLabel = () => {
    switch (stage()) {
      case "model": return `Loading model… ${pct()}%`;
      case "index": return `Loading index… ${pct()}%`;
      case "ready": return null;
      default: return null;
    }
  };

  // Start worker when user first focuses or types
  const ensureWorker = () => {
    if (!workerStarted()) {
      setWorkerStarted(true);
      vectorSearch.init().catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      );
    }
  };

  const runSearch = async (q: string) => {
    if (!q.trim()) {
      props.onResults(null);
      return;
    }
    if (!vectorSearch.isReady) {
      // Worker still loading — wait for it
      try {
        await vectorSearch.init();
      } catch {
        return;
      }
    }
    setSearching(true);
    setError(null);
    try {
      const { results } = await vectorSearch.search(q.trim());
      props.onResults(results);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  };

  const handleInput = (e: InputEvent) => {
    const val = (e.currentTarget as HTMLInputElement).value;
    setQuery(val);
    ensureWorker();
    if (debounceTimer) clearTimeout(debounceTimer);
    if (!val.trim()) {
      props.onResults(null);
      return;
    }
    debounceTimer = setTimeout(() => void runSearch(val), 400);
  };

  const handleClear = () => {
    setQuery("");
    props.onResults(null);
  };

  return (
    <div class="flex flex-col gap-1 w-full max-w-xl">
      <div class="relative flex items-center">
        <span class="absolute left-3 text-white/40 text-sm select-none pointer-events-none">
          🔍
        </span>
        <input
          type="search"
          value={query()}
          onInput={handleInput}
          onFocus={ensureWorker}
          placeholder="Search photos…"
          class="w-full bg-white/10 text-white placeholder-white/40 rounded-lg pl-9 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-white/30 transition"
          autocomplete="off"
          spellcheck={false}
        />
        <Show when={query()}>
          <button
            class="absolute right-2 text-white/40 hover:text-white/80 text-lg leading-none"
            onClick={handleClear}
            aria-label="Clear search"
          >
            ×
          </button>
        </Show>
      </div>

      {/* Status row */}
      <Show when={stageLabel() || searching() || error()}>
        <p class="text-xs text-white/50 px-1">
          {error() ? (
            <span class="text-red-400">{error()}</span>
          ) : searching() ? (
            "Searching…"
          ) : (
            stageLabel()
          )}
        </p>
      </Show>

      {/* Progress bar while model/index loading */}
      <Show when={stage() === "model" || stage() === "index"}>
        <div class="h-0.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            class="h-full bg-white/60 transition-all duration-300"
            style={{ width: `${pct()}%` }}
          />
        </div>
      </Show>
    </div>
  );
}
