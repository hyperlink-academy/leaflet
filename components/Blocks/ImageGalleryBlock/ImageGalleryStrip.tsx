import { useGalleryImage } from "./shared";
import { ImageAltButton } from "../ImageAltButton";

export function ImageGalleryStrip(props: {
  imageEntities: string[];
  gap: number;
  editable: boolean;
  selected: boolean;
  onImageClick: (index: number) => void;
}) {
  return (
    <div className="flex flex-col w-full" style={{ gap: `${props.gap}px` }}>
      {props.imageEntities.map((entityID, i) => (
        <GalleryStripItem
          key={entityID}
          entityID={entityID}
          editable={props.editable}
          selected={props.selected}
          onClick={() => props.onImageClick(i)}
        />
      ))}
    </div>
  );
}

function GalleryStripItem(props: {
  entityID: string;
  editable: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  let image = useGalleryImage(props.entityID);
  if (!image) return null;
  return (
    <div className="relative group/image w-full">
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
      {props.editable && (
        <ImageAltButton entityID={props.entityID} selected={props.selected} />
      )}
    </div>
  );
}
