import { createSignal, createEffect, Show, onMount, onCleanup } from "solid-js";
import type { Photo } from "../types";
import { photoUrl, placeholderDataUrl } from "../types";

type Props = {
  photo: Photo;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export function Lightbox(props: Props) {
  const [imgLoaded, setImgLoaded] = createSignal(false);

  const src = () =>
    photoUrl(props.photo.medium ?? props.photo.small ?? props.photo.original);
  const placeholder = () => placeholderDataUrl(props.photo.placeholder);

  createEffect(() => {
    void props.photo.id;
    setImgLoaded(false);
  });

  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
      if (e.key === "ArrowLeft") props.onPrev();
      if (e.key === "ArrowRight") props.onNext();
      if ((e.metaKey || e.ctrlKey) && e.key === "c") {
        const url = src();
        if (!url) return;
        void (async () => {
          try {
            const res = await fetch(url);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
          } catch {
            // clipboard API unavailable or permission denied — silently ignore
          }
        })();
      }
    };
    window.addEventListener("keydown", handler);
    onCleanup(() => window.removeEventListener("keydown", handler));
  });

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={(e) => e.target === e.currentTarget && props.onClose()}
    >
      {/* Close */}
      <button
        class="absolute top-4 right-4 text-white/50 hover:text-white text-3xl leading-none z-10"
        onClick={props.onClose}
        aria-label="Close"
      >
        ×
      </button>

      {/* Counter */}
      <span class="absolute bottom-4 right-4 text-white/30 text-xs tabular-nums z-10">
        {props.index + 1} / {props.total}
      </span>

      {/* Prev */}
      <Show when={props.index > 0}>
        <button
          class="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-5xl leading-none z-10 px-2"
          onClick={props.onPrev}
          aria-label="Previous"
        >
          ‹
        </button>
      </Show>

      {/* Next */}
      <Show when={props.index < props.total - 1}>
        <button
          class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-5xl leading-none z-10 px-2"
          onClick={props.onNext}
          aria-label="Next"
        >
          ›
        </button>
      </Show>

      {/* Image */}
      <Show when={placeholder() && !imgLoaded()}>
        <img
          src={placeholder()}
          alt=""
          aria-hidden="true"
          class="object-contain"
          style={{
            "max-width": "90vw",
            "max-height": "90vh",
            filter: "blur(20px)",
            transform: "scale(1.05)",
          }}
        />
      </Show>
      <Show when={src()}>
        <img
          src={src()}
          alt=""
          class="object-contain transition-opacity duration-300"
          style={{
            "max-width": "90vw",
            "max-height": "90vh",
            opacity: imgLoaded() ? "1" : "0",
            position: imgLoaded() ? "static" : "absolute",
          }}
          onLoad={() => setImgLoaded(true)}
        />
      </Show>
    </div>
  );
}
