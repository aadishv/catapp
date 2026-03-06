import {
  createSignal,
  createMemo,
  For,
  Show,
  onMount,
  onCleanup,
} from "solid-js";
import { createVirtualizer } from "@tanstack/solid-virtual";
import type { Photo } from "../types";
import { photoUrl, placeholderDataUrl } from "../types";

const THUMB_SIZE = 180;
const GAP = 4;
const ROW_HEIGHT = THUMB_SIZE + GAP;
const MIN_COLS = 2;
const MAX_COLS = 10;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

type Props = {
  photos: Photo[];
  onSelect: (photo: Photo, index: number) => void;
};

export function MasonryGrid(props: Props) {
  let containerRef!: HTMLDivElement;
  let scrollRef!: HTMLDivElement;

  const [containerWidth, setContainerWidth] = createSignal(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );

  onMount(() => {
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(containerRef);
    onCleanup(() => ro.disconnect());
  });

  const cols = createMemo(() =>
    clamp(Math.floor(containerWidth() / (THUMB_SIZE + GAP)), MIN_COLS, MAX_COLS),
  );

  const rows = createMemo(() => {
    const c = cols();
    const out: Photo[][] = [];
    for (let i = 0; i < props.photos.length; i += c) {
      out.push(props.photos.slice(i, i + c));
    }
    return out;
  });

  const virtualizer = createVirtualizer({
    get count() {
      return rows().length;
    },
    getScrollElement: () => scrollRef,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  return (
    <div ref={containerRef} class="w-full h-full">
      <div
        ref={scrollRef}
        class="w-full h-full overflow-y-auto"
        style={{ "scroll-behavior": "auto" }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: "relative",
            width: "100%",
          }}
        >
          <For each={virtualizer.getVirtualItems()}>
            {(vRow) => (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vRow.start}px)`,
                  display: "flex",
                  gap: `${GAP}px`,
                  "padding-bottom": `${GAP}px`,
                }}
              >
                <For each={rows()[vRow.index] ?? []}>
                  {(photo) => {
                    const globalIndex = () =>
                      props.photos.indexOf(photo);
                    return (
                      <ThumbCell
                        photo={photo}
                        size={THUMB_SIZE}
                        onClick={() => props.onSelect(photo, globalIndex())}
                      />
                    );
                  }}
                </For>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

type ThumbProps = {
  photo: Photo;
  size: number;
  onClick: () => void;
};

function ThumbCell(props: ThumbProps) {
  const [loaded, setLoaded] = createSignal(false);
  const thumb = () => photoUrl(props.photo.thumb);
  const placeholder = () => placeholderDataUrl(props.photo.placeholder);

  return (
    <button
      class="relative overflow-hidden flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      style={{
        width: `${props.size}px`,
        height: `${props.size}px`,
        background: "#1a1a1a",
      }}
      onClick={props.onClick}
      aria-label={props.photo.title}
    >
      {/* blur-up placeholder */}
      <Show when={placeholder() && !loaded()}>
        <img
          src={placeholder()}
          alt=""
          aria-hidden="true"
          class="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "blur(8px)", transform: "scale(1.05)" }}
        />
      </Show>

      {/* real thumbnail */}
      <Show when={thumb()}>
        <img
          src={thumb()}
          alt={props.photo.title}
          loading="lazy"
          decoding="async"
          class="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: loaded() ? "1" : "0" }}
          onLoad={() => setLoaded(true)}
        />
      </Show>
    </button>
  );
}
