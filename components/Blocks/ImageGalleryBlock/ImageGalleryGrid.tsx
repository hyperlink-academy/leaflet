import { ReactNode } from "react";
import { GalleryItemClasses } from "./shared";
import { useGalleryColumns } from "./useGalleryColumns";

export function ImageGalleryGrid(props: {
  count: number;
  gap: number;
  maxWidth: number;
  renderItem: (index: number, classes: GalleryItemClasses) => ReactNode;
}) {
  let { containerRef, columns, layoutMaxWidth } = useGalleryColumns(props);

  return (
    <div ref={containerRef} className="w-full">
      <div
        className="grid mx-auto place-items-center"
        style={{
          width: "100%",
          maxWidth: layoutMaxWidth ? `${layoutMaxWidth}px` : undefined,
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
                "relative w-full overflow-hidden flex place-items-center",
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
