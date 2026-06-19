import { useEntity } from "src/replicache";
import { localImages } from "src/utils/addImage";

export type GalleryFormat = "grid" | "carousel" | "strip";
export const DEFAULT_GAP = 8;
export const DEFAULT_FORMAT: GalleryFormat = "grid";
export const DEFAULT_MAX_WIDTH = 300;

// Resolves the best available source for a gallery child image entity. Prefers
// the in-memory object URL while an upload is in flight, like ImageBlock.
export function useGalleryImage(entityID: string) {
  let image = useEntity(entityID, "block/image");
  let alt = useEntity(entityID, "image/alt")?.data.value;
  if (!image) return null;
  let localSrc = localImages.get(image.data.src);
  return {
    src: localSrc ?? image.data.src,
    alt: alt || "",
    width: image.data.width,
    height: image.data.height,
  };
}
