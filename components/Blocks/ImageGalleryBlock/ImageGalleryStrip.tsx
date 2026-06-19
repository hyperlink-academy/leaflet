import { useGalleryImage } from "./shared";

export function ImageGalleryStrip(props: {
  imageEntities: string[];
  gap: number;
  onImageClick: (index: number) => void;
}) {
  return (
    <div className="flex flex-col w-full" style={{ gap: `${props.gap}px` }}>
      {props.imageEntities.map((entityID, i) => (
        <GalleryStripItem
          key={entityID}
          entityID={entityID}
          onClick={() => props.onImageClick(i)}
        />
      ))}
    </div>
  );
}

function GalleryStripItem(props: { entityID: string; onClick: () => void }) {
  let image = useGalleryImage(props.entityID);
  if (!image) return null;
  return (
    <button type="button" onClick={props.onClick} className="block w-full">
      <img
        loading="lazy"
        decoding="async"
        alt={image.alt}
        src={image.src}
        width={image.width}
        height={image.height}
        className="w-full h-auto"
      />
    </button>
  );
}
