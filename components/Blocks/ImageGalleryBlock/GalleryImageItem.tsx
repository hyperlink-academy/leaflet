import { useGalleryImage } from "./shared";
import { ImageAltButton } from "../ImageAltButton";

// The image-plus-alt-overlay unit shared by every gallery format. Each format
// supplies its own wrapper/button/img classes; the click-to-open button and the
// ImageAltButton overlay are common.
export function GalleryImageItem(props: {
  entityID: string;
  editable: boolean;
  selected: boolean;
  onClick: () => void;
  className?: string;
  buttonClassName?: string;
  imgClassName?: string;
  // Grid sizes each cell by the image's aspect ratio so cells in a row align.
  useAspectRatio?: boolean;
}) {
  let image = useGalleryImage(props.entityID);
  if (!image) return null;
  return (
    <div className={`relative group/image ${props.className ?? ""}`}>
      <button
        type="button"
        onClick={props.onClick}
        className={props.buttonClassName}
        style={
          props.useAspectRatio
            ? { aspectRatio: `${image.width} / ${image.height}` }
            : undefined
        }
      >
        <img
          loading="lazy"
          decoding="async"
          alt={image.alt}
          src={image.src}
          width={image.width}
          height={image.height}
          className={props.imgClassName}
        />
      </button>
      <ImageAltButton
        entityID={props.entityID}
        selected={props.selected}
        canEdit={props.editable}
      />
    </div>
  );
}
