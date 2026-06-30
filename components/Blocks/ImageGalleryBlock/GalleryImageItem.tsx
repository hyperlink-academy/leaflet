import { ReactNode } from "react";
import { GalleryImage, GalleryItemClasses, useGalleryImage } from "./shared";
import { ImageAltButton } from "../ImageAltButton";

// The image-plus-overlay unit shared by every gallery format, editor and
// published alike. Each format supplies its own wrapper/button/img classes; the
// click-to-open button is common. `overlay` is the only per-context slot — the
// editor passes its alt-edit button, published passes a read-only alt popover.
export function GalleryImageItem(
  props: {
    image: GalleryImage;
    onClick?: () => void;
    overlay?: ReactNode;
  } & GalleryItemClasses,
) {
  let { image } = props;
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
      {props.overlay}
    </div>
  );
}

// Editor variant: resolves the image from replicache (preferring the in-flight
// object URL) and overlays the alt-text editor.
export function EditorGalleryImageItem(
  props: {
    entityID: string;
    editable: boolean;
    selected: boolean;
    onClick: () => void;
  } & GalleryItemClasses,
) {
  let image = useGalleryImage(props.entityID);
  if (!image) return null;
  return (
    <GalleryImageItem
      image={image}
      onClick={props.onClick}
      className={props.className}
      buttonClassName={props.buttonClassName}
      imgClassName={props.imgClassName}
      useAspectRatio={props.useAspectRatio}
      overlay={
        <ImageAltButton
          entityID={props.entityID}
          selected={props.selected}
          canEdit={props.editable}
        />
      }
    />
  );
}
