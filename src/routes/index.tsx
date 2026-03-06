import { createSignal, createResource, Show, createMemo } from "solid-js";
import { MasonryGrid } from "~/components/MasonryGrid";
import { SearchBar } from "~/components/SearchBar";
import { Lightbox } from "~/components/Lightbox";
import type { Photo, VectorHit } from "~/types";

async function fetchPhotos(): Promise<Photo[]> {
  const res = await fetch("/index.json");
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<Photo[]>;
}

export default function Home() {
  const [photos] = createResource(fetchPhotos);
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
        <SearchBar onResults={setHits} />
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
        <MasonryGrid
          photos={visiblePhotos()}
          topPadding={48}
          onSelect={(_photo, index) => setLightboxIndex(index)}
        />
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
