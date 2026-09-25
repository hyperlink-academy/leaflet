import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CloseTiny } from "components/Icons/CloseTiny";
import { GalleryImage, useGalleryImage } from "./shared";
import { GoToArrowLined } from "components/Icons/GoToArrowLined";

const AltExpandedContext = createContext(false);

export function ImageGalleryLightbox(props: {
  count: number;
  index: number | null;
  onIndexChange: (index: number | null) => void;
  renderSlide: (index: number) => ReactNode;
  altExpanded?: boolean;
}) {
  let open = props.index !== null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) props.onIndexChange(null);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed z-50 inset-0 bg-primary/80 backdrop-blur-sm data-[state=open]:animate-overlayShow" />
        <Dialog.Content
          aria-describedby={undefined}
          className="portalStyles z-50 fixed inset-0 outline-none"
        >
          <Dialog.Title className="sr-only">Image</Dialog.Title>
          <Dialog.Close
            className="fixed top-4 right-4 z-10 bg-bg-page rounded-full p-1 border border-border-light text-tertiary"
            aria-label="Close"
          >
            <CloseTiny />
          </Dialog.Close>

          {open && (
            <LightboxContent
              count={props.count}
              initialIndex={props.index ?? 0}
              altExpanded={!!props.altExpanded}
              renderSlide={props.renderSlide}
              onClose={() => props.onIndexChange(null)}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function LightboxContent(props: {
  count: number;
  initialIndex: number;
  altExpanded: boolean;
  renderSlide: (index: number) => ReactNode;
  onClose: () => void;
}) {
  let scrollRef = useRef<HTMLDivElement>(null);
  let [current, setCurrent] = useState(props.initialIndex);
  let count = props.count;

  // Jump to the opened image on mount, without a scroll animation.
  useEffect(() => {
    let el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = props.initialIndex * el.clientWidth;
  }, [props.initialIndex]);

  // Derive the active slide from scroll position so swipe, trackpad, shift+wheel
  // and the arrow controls all stay in sync.
  let onScroll = () => {
    let el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    let index = Math.round(el.scrollLeft / el.clientWidth);
    setCurrent(Math.max(0, Math.min(count - 1, index)));
  };

  let scrollToIndex = (index: number) => {
    let el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  };

  // Left/right arrow keys advance the lightbox.
  useEffect(() => {
    let handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight")
        scrollToIndex(Math.min(count - 1, current + 1));
      else if (e.key === "ArrowLeft") scrollToIndex(Math.max(0, current - 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, count]);

  return (
    <div className="flex flex-col gap-8 pt-12 pb-12 h-full">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        onClick={props.onClose}
        className="w-full h-full grid grid-rows-1 grid-flow-col auto-cols-[100%] overflow-x-auto snap-x snap-mandatory no-scrollbar"
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-full snap-center snap-always flex flex-col items-center justify-center gap-3"
          >
            <AltExpandedContext.Provider
              value={props.altExpanded && i === props.initialIndex}
            >
              {props.renderSlide(i)}
            </AltExpandedContext.Provider>
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="flex items-center gap-4 mx-auto text-border-light text-sm">
          {current > 0 ? (
            <button
              type="button"
              aria-label="Previous image"
              className="flex place-items-center justify-center w-6 h-6 rounded-full hover:bg-accent-1 text-border-light hover:text-accent-2 "
              onClick={(e) => {
                e.stopPropagation();
                scrollToIndex(current - 1);
              }}
            >
              <GoToArrowLined className="rotate-180" />
            </button>
          ) : (
            <div className="w-6 h-6" />
          )}
          {current + 1} / {count}
          {current < count - 1 ? (
            <button
              type="button"
              aria-label="Next image"
              className="flex place-items-center justify-center w-6 h-6 rounded-full hover:bg-accent-1 text-border-light hover:text-accent-2 "
              onClick={(e) => {
                e.stopPropagation();
                scrollToIndex(current + 1);
              }}
            >
              <GoToArrowLined className="shrink-0 grow-0" />
            </button>
          ) : (
            <div className="w-6 h-6" />
          )}
        </div>
      )}
    </div>
  );
}

// Presentational slide shared by editor and published lightboxes.
export function LightboxSlide(props: { image: GalleryImage }) {
  let { image } = props;
  return (
    <div className="flex-1 h-full w-full flex flex-col gap-3 min-h-0 justify-center items-center px-4 sm:px-8">
      <img
        alt={image.alt}
        src={image.fullSrc ?? image.src}
        className=" min-h-0 max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <div></div>
      {image.alt && <LightboxAltText alt={image.alt} />}
    </div>
  );
}

function LightboxAltText(props: { alt: string }) {
  let [expanded, setExpanded] = useState(useContext(AltExpandedContext));
  let [clamped, setClamped] = useState(false);
  let clampedRef = useRef<HTMLDivElement>(null);

  // Only measure while collapsed — once expanded the clamp is gone and the
  // element no longer overflows, which would hide the toggle.
  useEffect(() => {
    if (expanded) return;
    let el = clampedRef.current;
    if (!el) return;
    let measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    measure();
    let observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [props.alt, expanded]);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="shrink-0 w-full max-w-prose flex flex-col items-center gap-1"
    >
      <div className="relative w-full">
        {/* Kept mounted while expanded so the image doesn't shift under the overlay. */}
        <div
          ref={clampedRef}
          className={`whitespace-pre-wrap text-bg-page text-sm line-clamp-3 text-center ${expanded ? "invisible" : ""}`}
        >
          {props.alt}
        </div>
        {expanded && (
          <div className="absolute bottom-0 inset-x-0 max-h-[60svh] overflow-y-auto opaque-container whitespace-pre-wrap text-secondary text-sm px-2 py-1.5 text-left ">
            {props.alt}
          </div>
        )}
      </div>
      {(clamped || expanded) && (
        <button
          type="button"
          className="text-accent-contrast text-sm"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </div>
  );
}

// Editor variant: resolves the slide image from replicache.
export function EditorLightboxSlide(props: { entityID: string }) {
  let image = useGalleryImage(props.entityID);
  if (!image) return null;
  return <LightboxSlide image={image} />;
}
