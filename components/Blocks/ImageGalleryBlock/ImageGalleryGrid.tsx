import { useGalleryImage } from "./shared";

export function ImageGalleryGrid(props: {
  imageEntities: string[];
  gap: number;
  onImageClick: (index: number) => void;
}) {
  let columns = Math.min(props.imageEntities.length, 3);
  return (
    <div
      className="grid w-full"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: `${props.gap}px`,
      }}
    >
      {props.imageEntities.map((entityID, i) => (
        <GalleryGridItem
          key={entityID}
          entityID={entityID}
          onClick={() => props.onImageClick(i)}
        />
      ))}
    </div>
  );
}

function GalleryGridItem(props: { entityID: string; onClick: () => void }) {
  let image = useGalleryImage(props.entityID);
  if (!image) return null;
  return (
    <button
      type="button"
      onClick={props.onClick}
      // Aspect ratio reserves each cell's natural height; align-items: stretch
      // makes every cell in a row match the tallest, and object-cover fills the
      // shorter ones.
      className="relative block w-full overflow-hidden"
      style={{ aspectRatio: `${image.width} / ${image.height}` }}
    >
      <img
        loading="lazy"
        decoding="async"
        alt={image.alt}
        src={image.src}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </button>
  );
}
