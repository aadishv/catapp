import { createSignal, Show } from "solid-js";
import { vectorSearch, loadStage } from "../services/vector-search";
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
  let inputRef!: HTMLInputElement;

  const stage = loadStage;

  const statusText = (): string | null => {
    if (error()) return error();
    if (searching()) return "searching…";
    if (stage() === "model" || stage() === "index") return "loading…";
    return null;
  };

  const ensureWorker = () => {
    if (!workerStarted()) {
      setWorkerStarted(true);
      vectorSearch.init().catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      );
    }
  };

  const runSearch = async (q: string) => {
    if (!q.trim()) { props.onResults(null); return; }
    if (!vectorSearch.isReady) {
      try { await vectorSearch.init(); } catch { return; }
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
    if (!val.trim()) { props.onResults(null); return; }
    debounceTimer = setTimeout(() => void runSearch(val), 400);
  };

  const handleClear = () => {
    setQuery("");
    props.onResults(null);
    inputRef.focus();
  };

  return (
    <div style={{ width: "min(320px, calc(100vw - 32px))", position: "relative" }}>
      <div class="search-pill">
        <input
          ref={inputRef}
          type="search"
          class="search-input"
          value={query()}
          onInput={handleInput}
          onFocus={ensureWorker}
          placeholder="search"
          autocomplete="off"
          spellcheck={false}
        />
        <Show when={query()}>
          <button
            onClick={handleClear}
            aria-label="Clear"
            style={{ color: "var(--fg-dim)", background: "none", border: "none", cursor: "pointer", "font-size": "18px", "line-height": "1", padding: "0", "flex-shrink": "0" }}
          >
            ×
          </button>
        </Show>
      </div>

      {/* Absolutely positioned so they never affect the pill's layout */}
      <Show when={statusText()}>
        <span style={{ position: "absolute", top: "calc(100% + 5px)", left: "50%", transform: "translateX(-50%)", "font-size": "10px", color: error() ? "rgba(200,60,60,0.9)" : "var(--fg-faint)", "white-space": "nowrap", "letter-spacing": "0.02em" }}>
          {statusText()}
        </span>
      </Show>


    </div>
  );
}
