import { ReactNode } from "react";
import { GalleryItemClasses } from "./shared";
import { useGalleryColumns } from "./useGalleryColumns";

export function ImageGalleryMasonry(props: {
  aspectRatios: number[];
  gap: number;
  maxWidth: number;
  renderItem: (index: number, classes: GalleryItemClasses) => ReactNode;
}) {
  let count = props.aspectRatios.length;
  let { containerRef, columns, layoutMaxWidth } = useGalleryColumns({
    count,
    gap: props.gap,
    maxWidth: props.maxWidth,
  });

  let avgAspect = props.aspectRatios.reduce((sum, a) => sum + a, 0) / count;
  let rows: number[][] = [];
  for (let i = 0; i < count; i += columns) {
    rows.push(
      Array.from({ length: Math.min(columns, count - i) }, (_, j) => i + j),
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      <div
        className="flex flex-col mx-auto"
        style={{
          width: "100%",
          maxWidth: layoutMaxWidth ? `${layoutMaxWidth}px` : undefined,
          gap: `${props.gap}px`,
        }}
      >
        {rows.map((row, ri) => {
          let missing = columns - row.length;
          return (
            <div key={ri} className="flex" style={{ gap: `${props.gap}px` }}>
              {row.map((i) => (
                <div
                  key={i}
                  className="min-w-0"
                  style={{ flex: `${props.aspectRatios[i]} 1 0px` }}
                >
                  {props.renderItem(i, {
                    className: "w-full",
                    buttonClassName: "block w-full",
                    imgClassName: "w-full h-auto",
                  })}
                </div>
              ))}
              {missing > 0 && (
                <div
                  aria-hidden
                  style={{
                    flex: `${avgAspect * missing} 1 0px`,
                    marginLeft: (missing - 1) * props.gap,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
