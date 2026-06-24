import { ReactNode, useEffect, useRef, useState } from "react";
import { GalleryItemClasses } from "./shared";

export function ImageGalleryGrid(props: {
  count: number;
  gap: number;
  maxWidth: number;
  renderItem: (index: number, classes: GalleryItemClasses) => ReactNode;
}) {
  let containerRef = useRef<HTMLDivElement>(null);
  let [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    let el = containerRef.current;
    if (!el) return;
    let observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Pick the column count whose resulting column width lands as close to
  // maxWidth as possible without exceeding it; one fewer column would push each
  // image over maxWidth. Cap at the image count so we never render empty cells.
  let columns =
    containerWidth > 0
      ? Math.max(
          1,
          Math.min(Math.ceil(containerWidth / props.maxWidth), props.count),
        )
      : Math.min(props.count, 3);

  // Cap the grid's own width so that when there are fewer images than columns
  // would otherwise fit, each image stays at maxWidth rather than stretching.
  let gridMaxWidth =
    containerWidth > 0
      ? columns * props.maxWidth + (columns - 1) * props.gap
      : undefined;

  return (
    <div ref={containerRef} className="w-full">
      <div
        className="grid mx-auto place-items-center"
        style={{
          width: "100%",
          maxWidth: gridMaxWidth ? `${gridMaxWidth}px` : undefined,
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: `${props.gap}px`,
        }}
      >
        {Array.from({ length: props.count }).map((_, i) => (
          // Aspect ratio reserves each cell's natural height; align-items:
          // stretch makes every cell in a row match the tallest, and
          // object-cover fills the shorter ones.
          <div key={i} className="contents">
            {props.renderItem(i, {
              className: "w-full",
              buttonClassName:
                "relative w-full overflow-hidde flex place-items-center",
              imgClassName:
                "absolute inset-0 max-w-full max-h-full object-cover m-auto",
              useAspectRatio: true,
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
