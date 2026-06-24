import { ReactNode, useRef, useState } from "react";
import { GoToArrowLined } from "components/Icons/GoToArrowLined";
import { GalleryItemClasses } from "./shared";

export function ImageGalleryCarousel(props: {
  count: number;
  renderItem: (index: number, classes: GalleryItemClasses) => ReactNode;
}) {
  let scrollRef = useRef<HTMLDivElement>(null);
  let [current, setCurrent] = useState(0);
  let count = props.count;

  // Derive the active slide from scroll position so native side-scrolling
  // (touch swipe, trackpad, shift+wheel) and the arrow buttons stay in sync.
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

  return (
    <div className="relative w-full">
      <div className="relative w-full">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="grid grid-flow-col auto-cols-[100%] overflow-x-auto snap-x snap-mandatory no-scrollbar"
        >
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="snap-center snap-always flex items-center justify-center"
            >
              {props.renderItem(i, {
                buttonClassName: "block",
                imgClassName: "w-full max-h-[70vh] object-contain",
              })}
            </div>
          ))}
        </div>

        {current !== 0 && (
          <CarouselArrow
            direction="left"
            className="absolute left-2 top-1/2 -translate-y-1/2"
            onClick={() => scrollToIndex(current - 1)}
          />
        )}
        {current < count - 1 && (
          <CarouselArrow
            direction="right"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => scrollToIndex(current + 1)}
          />
        )}
      </div>

      <div className="imageGalleryCarouselControls px-2 py-0.5 text-tertiary text-sm text-center mx-auto pt-2">
        {current + 1} / {count}
      </div>
    </div>
  );
}

function CarouselArrow(props: {
  direction: "left" | "right";
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={props.direction === "left" ? "Previous image" : "Next image"}
      onClick={(e) => {
        e.stopPropagation();
        props.onClick();
      }}
      onMouseDown={(e) => e.preventDefault()}
      className={`light-container hover:text-accent-contrast hover:border-accent-contrast rounded-full! p-1 ${props.className ?? ""}`}
    >
      <GoToArrowLined
        className={props.direction === "left" ? "rotate-180" : ""}
      />
    </button>
  );
}
