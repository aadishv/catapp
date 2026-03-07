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

const TARGET_HEIGHT = 220; // target row height in px
const GAP = 3;

type LayoutPhoto = {
  photo: Photo;
  globalIndex: number;
  width: number;
};

type LayoutRow = {
  photos: LayoutPhoto[];
  height: number;
};

function computeLayout(
  photos: Photo[],
  containerWidth: number,
): LayoutRow[] {
  if (containerWidth <= 0 || photos.length === 0) return [];

  const rows: LayoutRow[] = [];
  let pending: Array<{ photo: Photo; ar: number; idx: number }> = [];
  let arSum = 0;

  const commitRow = (height: number) => {
    rows.push({
      photos: pending.map(({ photo, ar, idx }) => ({
        photo,
        globalIndex: idx,
        width: Math.round(ar * height),
      })),
      height: Math.round(height),
    });
    pending = [];
    arSum = 0;
  };

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]!;
    const ar = photo.w > 0 && photo.h > 0 ? photo.w / photo.h : 1;
    pending.push({ photo, ar, idx: i });
    arSum += ar;

    const gapTotal = (pending.length - 1) * GAP;
    const rowHeight = (containerWidth - gapTotal) / arSum;
    const isLast = i === photos.length - 1;

    if (rowHeight <= TARGET_HEIGHT) {
      commitRow(rowHeight);
    } else if (isLast) {
      // Final partial row — don't stretch, cap at target height
      commitRow(Math.min(rowHeight, TARGET_HEIGHT));
    }
  }

  return rows;
}

type Props = {
  photos: Photo[];
  topPadding?: number;
  onSelect: (photo: Photo, index: number) => void;
};

export function MasonryGrid(props: Props) {
  let containerRef!: HTMLDivElement;
  let scrollRef!: HTMLDivElement;

  const [containerWidth, setContainerWidth] = createSignal(0);

  onMount(() => {
    setContainerWidth(containerRef.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(containerRef);
    onCleanup(() => ro.disconnect());
  });

  const layout = createMemo(() =>
    computeLayout(props.photos, containerWidth()),
  );

  const virtualizer = createVirtualizer({
    get count() {
      return layout().length;
    },
    getScrollElement: () => scrollRef,
    estimateSize: (i) => (layout()[i]?.height ?? TARGET_HEIGHT) + GAP,
    overscan: 3,
  });

  return (
    <div ref={containerRef} class="w-full h-full">
      <div ref={scrollRef} class="w-full h-full overflow-y-auto" style={{ "padding-top": `${props.topPadding ?? 0}px`, "scrollbar-width": "thin" }}>
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: "relative",
            width: "100%",
          }}
        >
          <For each={virtualizer.getVirtualItems()}>
            {(vRow) => {
              const row = () => layout()[vRow.index];
              return (
                <Show when={row()}>
                  {(r) => (
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
                      <For each={r().photos}>
                        {(lp) => (
                          <PhotoCell
                            photo={lp.photo}
                            width={lp.width}
                            height={r().height}
                            onClick={() =>
                              props.onSelect(lp.photo, lp.globalIndex)
                            }
                          />
                        )}
                      </For>
                    </div>
                  )}
                </Show>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
}

type CellProps = {
  photo: Photo;
  width: number;
  height: number;
  onClick: () => void;
};

function PhotoCell(props: CellProps) {
  const [loaded, setLoaded] = createSignal(false);
  // Use small (aspect-ratio preserving) if available, else thumb
  const src = () => photoUrl(props.photo.small ?? props.photo.thumb);
  const placeholder = () => placeholderDataUrl(props.photo.placeholder);

  return (
    <button
      class="relative overflow-hidden flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      style={{
        width: `${props.width}px`,
        height: `${props.height}px`,
        background: "var(--cell-bg)",
        "flex-shrink": "0",
      }}
      onClick={props.onClick}
    >
      <Show when={placeholder() && !loaded()}>
        <img
          src={placeholder()}
          alt=""
          aria-hidden="true"
          class="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "blur(12px)", transform: "scale(1.08)" }}
        />
      </Show>
      <Show when={src()}>
        <img
          src={src()}
          alt=""
          loading="lazy"
          decoding="async"
          class="absolute inset-0 w-full h-full object-cover transition-opacity duration-200"
          style={{ opacity: loaded() ? "1" : "0" }}
          onLoad={() => setLoaded(true)}
        />
      </Show>
    </button>
  );
}
