import { useEffect, useRef, useState } from "react";
import { useGalleryImage } from "./shared";
import { ImageAltButton } from "../ImageAltButton";

export function ImageGalleryGrid(props: {
  imageEntities: string[];
  gap: number;
  maxWidth: number;
  editable: boolean;
  selected: boolean;
  onImageClick: (index: number) => void;
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
          Math.min(
            Math.ceil(containerWidth / props.maxWidth),
            props.imageEntities.length,
          ),
        )
      : Math.min(props.imageEntities.length, 3);

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
        {props.imageEntities.map((entityID, i) => (
          <GalleryGridItem
            key={entityID}
            entityID={entityID}
            editable={props.editable}
            selected={props.selected}
            onClick={() => props.onImageClick(i)}
          />
        ))}
      </div>
    </div>
  );
}

function GalleryGridItem(props: {
  entityID: string;
  editable: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  let image = useGalleryImage(props.entityID);
  if (!image) return null;
  return (
    <div className="relative group/image w-full">
      <button
        type="button"
        onClick={props.onClick}
        // Aspect ratio reserves each cell's natural height; align-items: stretch
        // makes every cell in a row match the tallest, and object-cover fills the
        // shorter ones.
        className="relative w-full overflow-hidde flex place-items-center"
        style={{ aspectRatio: `${image.width} / ${image.height}` }}
      >
        <img
          loading="lazy"
          decoding="async"
          width={image.width}
          height={image.height}
          alt={image.alt}
          src={image.src}
          className="absolute inset-0 max-w-full max-h-full object-cover m-auto"
        />
      </button>
      {props.editable && (
        <ImageAltButton entityID={props.entityID} selected={props.selected} />
      )}
    </div>
  );
}
