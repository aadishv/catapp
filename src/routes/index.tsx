import { createSignal, createResource, Show, createMemo, onMount, onCleanup } from "solid-js";
import { MasonryGrid } from "~/components/MasonryGrid";
import { SearchBar } from "~/components/SearchBar";
import { Lightbox } from "~/components/Lightbox";
import type { Photo, VectorHit } from "~/types";
import { loadPhotoIndex, shufflePhotoIndex } from "~/services/photo-index";

export default function Home() {
  const [photos, { mutate }] = createResource(loadPhotoIndex);
  const [hits, setHits] = createSignal<VectorHit[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = createSignal<number | null>(null);

  const visiblePhotos = createMemo<Photo[]>(() => {
    const all = photos();
    if (!all) return [];
    const h = hits();
    if (!h) return all;
    const byId = new Map<string, Photo>(all.map((p) => [p.id, p]));
    return h.map((hit) => byId.get(hit.photo_id)).filter((p): p is Photo => p !== undefined);
  });

  const shuffle = () => {
    const all = photos();
    if (!all) return;
    void shufflePhotoIndex(all).then(mutate);
    setLightboxIndex(null);
  };

  let focusSearch: (() => void) | undefined;

  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if (lightboxIndex() !== null) return;
      const meta = e.metaKey || e.ctrlKey;
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable;

      if ((meta && (e.key === "f" || e.key === "k")) || (!inInput && e.key === "/")) {
        e.preventDefault();
        focusSearch?.();
      }
    };
    window.addEventListener("keydown", handler);
    onCleanup(() => window.removeEventListener("keydown", handler));
  });

  const closeLightbox = () => setLightboxIndex(null);
  const prevPhoto = () => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i));
  const nextPhoto = () =>
    setLightboxIndex((i) => (i !== null && i < visiblePhotos().length - 1 ? i + 1 : i));

  const activeLightboxPhoto = () => {
    const idx = lightboxIndex();
    return idx !== null ? (visiblePhotos()[idx] ?? null) : null;
  };

  return (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      {/* Fixed opaque top bar */}
      <div class="top-bar">
        <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
          <SearchBar onResults={setHits} registerFocus={(fn) => { focusSearch = fn; }} />
          <button
            onClick={shuffle}
            title="Shuffle"
            aria-label="Shuffle photos"
            style={{ background: "none", border: "none", cursor: "pointer", "font-size": "17px", color: "var(--fg-dim)", padding: "0", "flex-shrink": "0", "line-height": "1" }}
          >
            🎲
          </button>
        </div>
      </div>

      {/* Grid — padded below the bar */}
      <Show when={photos.error}>
        <div style={{ display: "flex", "align-items": "center", "justify-content": "center", height: "100%", "font-size": "13px", color: "var(--fg-dim)" }}>
          failed to load
        </div>
      </Show>

      <Show when={photos.loading}>
        <div style={{ display: "flex", "align-items": "center", "justify-content": "center", height: "100%", "font-size": "13px", color: "var(--fg-faint)" }}>
          loading…
        </div>
      </Show>

      <Show when={photos() && !photos.loading}>
        <div style={{ position: "fixed", top: "48px", left: 0, right: 0, bottom: 0 }}>
          <MasonryGrid
            photos={visiblePhotos()}
            topPadding={0}
            onSelect={(_photo, index) => setLightboxIndex(index)}
          />
        </div>
      </Show>

      <Show when={activeLightboxPhoto()}>
        {(photo) => (
          <Lightbox
            photo={photo()}
            index={lightboxIndex()!}
            total={visiblePhotos().length}
            onClose={closeLightbox}
            onPrev={prevPhoto}
            onNext={nextPhoto}
          />
        )}
      </Show>
    </div>
  );
}
