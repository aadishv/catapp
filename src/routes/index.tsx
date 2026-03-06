import { createSignal, createResource, Show, createMemo } from "solid-js";
import { MasonryGrid } from "~/components/MasonryGrid";
import { SearchBar } from "~/components/SearchBar";
import { Lightbox } from "~/components/Lightbox";
import type { Photo, VectorHit } from "~/types";

async function fetchPhotos(): Promise<Photo[]> {
  const res = await fetch("/index.json");
  if (!res.ok) throw new Error(`Failed to load index: ${res.status}`);
  return res.json() as Promise<Photo[]>;
}

export default function Home() {
  const [photos] = createResource(fetchPhotos);
  const [hits, setHits] = createSignal<VectorHit[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = createSignal<number | null>(null);

  // Derive visible list: search results in score order, or all photos
  const visiblePhotos = createMemo<Photo[]>(() => {
    const all = photos();
    if (!all) return [];
    const h = hits();
    if (!h) return all;

    // Build a map from photo_id → photo for O(1) lookup
    const byId = new Map<string, Photo>(all.map((p) => [p.id, p]));
    return h
      .map((hit) => byId.get(hit.photo_id))
      .filter((p): p is Photo => p !== undefined);
  });

  const openLightbox = (_photo: Photo, index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => setLightboxIndex(null);

  const prevPhoto = () => {
    setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i));
  };

  const nextPhoto = () => {
    setLightboxIndex((i) =>
      i !== null && i < visiblePhotos().length - 1 ? i + 1 : i,
    );
  };

  const activeLightboxPhoto = () => {
    const idx = lightboxIndex();
    if (idx === null) return null;
    return visiblePhotos()[idx] ?? null;
  };

  return (
    <main class="flex flex-col h-screen bg-[#0f0f0f] text-white overflow-hidden">
      {/* Header */}
      <header class="flex items-center gap-4 px-4 py-3 border-b border-white/10 flex-shrink-0">
        <h1 class="text-white/90 font-semibold text-sm tracking-wide select-none">
          📷 catapp
        </h1>
        <SearchBar onResults={setHits} />
        <Show when={hits()}>
          <span class="text-white/40 text-xs whitespace-nowrap">
            {visiblePhotos().length} results
          </span>
        </Show>
        <Show when={photos()}>
          <span class="text-white/30 text-xs whitespace-nowrap ml-auto">
            {(photos()!.length).toLocaleString()} photos
          </span>
        </Show>
      </header>

      {/* Grid area */}
      <div class="flex-1 min-h-0 p-1">
        <Show when={photos.error}>
          <div class="flex items-center justify-center h-full text-red-400 text-sm">
            Failed to load photos: {String(photos.error)}
          </div>
        </Show>
        <Show when={photos.loading}>
          <div class="flex items-center justify-center h-full text-white/40 text-sm">
            Loading…
          </div>
        </Show>
        <Show when={photos() && !photos.loading}>
          <MasonryGrid
            photos={visiblePhotos()}
            onSelect={openLightbox}
          />
        </Show>
      </div>

      {/* Lightbox */}
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
    </main>
  );
}
