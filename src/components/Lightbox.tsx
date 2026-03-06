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

  // Reset loaded state when photo changes
  createEffect(() => {
    void props.photo.id;
    setImgLoaded(false);
  });

  // Keyboard navigation
  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
      if (e.key === "ArrowLeft") props.onPrev();
      if (e.key === "ArrowRight") props.onNext();
    };
    window.addEventListener("keydown", handler);
    onCleanup(() => window.removeEventListener("keydown", handler));
  });

  const formatDate = (s: string) => {
    const d = new Date(s.replace(" ", "T"));
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={(e) => e.target === e.currentTarget && props.onClose()}
    >
      {/* Close */}
      <button
        class="absolute top-4 right-4 text-white/70 hover:text-white text-3xl leading-none z-10"
        onClick={props.onClose}
        aria-label="Close"
      >
        ×
      </button>

      {/* Prev */}
      <Show when={props.index > 0}>
        <button
          class="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-4xl leading-none z-10 px-2"
          onClick={props.onPrev}
          aria-label="Previous photo"
        >
          ‹
        </button>
      </Show>

      {/* Next */}
      <Show when={props.index < props.total - 1}>
        <button
          class="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-4xl leading-none z-10 px-2"
          onClick={props.onNext}
          aria-label="Next photo"
        >
          ›
        </button>
      </Show>

      {/* Image */}
      <div class="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-3">
        <div
          class="relative overflow-hidden"
          style={{
            "max-width": "90vw",
            "max-height": "78vh",
          }}
        >
          <Show when={placeholder() && !imgLoaded()}>
            <img
              src={placeholder()}
              alt=""
              aria-hidden="true"
              class="w-full h-full object-contain"
              style={{
                filter: "blur(20px)",
                transform: "scale(1.05)",
                "max-width": "90vw",
                "max-height": "78vh",
              }}
            />
          </Show>
          <Show when={src()}>
            <img
              src={src()}
              alt={props.photo.title}
              class="object-contain transition-opacity duration-300"
              style={{
                "max-width": "90vw",
                "max-height": "78vh",
                opacity: imgLoaded() ? "1" : "0",
                position: imgLoaded() ? "relative" : "absolute",
                inset: "0",
              }}
              onLoad={() => setImgLoaded(true)}
            />
          </Show>
        </div>

        {/* Meta */}
        <div class="text-center text-white/70 text-sm">
          <p class="text-white/50 text-xs">
            {formatDate(props.photo.taken_at)} &nbsp;·&nbsp; {props.index + 1} / {props.total}
          </p>
        </div>
      </div>
    </div>
  );
}
