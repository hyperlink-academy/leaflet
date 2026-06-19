import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { CloseTiny } from "components/Icons/CloseTiny";
import { useGalleryImage } from "./shared";

export function ImageGalleryLightbox(props: {
  imageEntities: string[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
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
          className="z-50 fixed inset-0 outline-none"
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
              imageEntities={props.imageEntities}
              initialIndex={props.index ?? 0}
              onClose={() => props.onIndexChange(null)}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function LightboxContent(props: {
  imageEntities: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  let scrollRef = useRef<HTMLDivElement>(null);
  let [current, setCurrent] = useState(props.initialIndex);
  let count = props.imageEntities.length;

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
      if (e.key === "ArrowRight") scrollToIndex(Math.min(count - 1, current + 1));
      else if (e.key === "ArrowLeft") scrollToIndex(Math.max(0, current - 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, count]);

  return (
    <>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        onClick={props.onClose}
        className="w-full h-full grid grid-flow-col auto-cols-[100%] overflow-x-auto snap-x snap-mandatory no-scrollbar"
      >
        {props.imageEntities.map((entityID) => (
          <div
            key={entityID}
            className="h-full snap-center snap-always flex flex-col items-center justify-center gap-3 p-4 sm:p-8"
          >
            <LightboxSlide entityID={entityID} />
          </div>
        ))}
      </div>

      {current > 0 && (
        <button
          type="button"
          aria-label="Previous image"
          className="fixed left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-full bg-bg-page text-primary border border-border-light"
          onClick={(e) => {
            e.stopPropagation();
            scrollToIndex(current - 1);
          }}
        >
          <ArrowRightTiny className="rotate-180" />
        </button>
      )}
      {current < count - 1 && (
        <button
          type="button"
          aria-label="Next image"
          className="fixed right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-full bg-bg-page text-primary border border-border-light"
          onClick={(e) => {
            e.stopPropagation();
            scrollToIndex(current + 1);
          }}
        >
          <ArrowRightTiny />
        </button>
      )}

      {count > 1 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-bg-page text-primary text-sm border border-border-light">
          {current + 1} / {count}
        </div>
      )}
    </>
  );
}

function LightboxSlide(props: { entityID: string }) {
  let image = useGalleryImage(props.entityID);
  if (!image) return null;
  return (
    <>
      <div className="flex-1 min-h-0 flex items-center justify-center w-full">
        <img
          alt={image.alt}
          src={image.src}
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      {image.alt && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 max-w-full whitespace-pre-wrap bg-bg-page text-primary text-sm rounded-md px-2 py-1 border border-border-light"
        >
          {image.alt}
        </div>
      )}
    </>
  );
}
