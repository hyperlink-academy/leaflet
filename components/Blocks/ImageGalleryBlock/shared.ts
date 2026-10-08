import { useEntity, useReplicache } from "src/replicache";
import { useSubscribe } from "src/replicache/useSubscribe";
import { scanIndex } from "src/replicache/utils";
import { localImages } from "src/utils/addImage";

export type GalleryFormat = "grid" | "carousel" | "strip" | "masonry";
export const DEFAULT_GAP = 8;
export const DEFAULT_FORMAT: GalleryFormat = "grid";
export const DEFAULT_MAX_WIDTH = 300;

// A resolved image, independent of where it came from (replicache facts in the
// editor, lexicon blobs in a published post). The presentational layout
// components only ever see this shape.
export type GalleryImage = {
  src: string;
  // Untransformed source for the lightbox, when `src` is a downscaled display
  // variant.
  fullSrc?: string;
  // Canonical storage URL from the fact (editor only) — the key upload status
  // is tracked under, even while `src` is the local object URL.
  factSrc?: string;
  mimeType?: string;
  /** Video rendition of an animated GIF (published only). */
  videoSrc?: string;
  alt: string;
  width: number;
  height: number;
};

// Per-layout class names handed to each format's rendered item, so the editor
// and published renderers style identical markup without duplicating strings.
export type GalleryItemClasses = {
  className?: string;
  buttonClassName?: string;
  imgClassName?: string;
  useAspectRatio?: boolean;
};

// width / height of each gallery child image, in order, for layouts that place
// images by shape before they render. Unresolved images count as square.
export function useGalleryAspectRatios(entityIDs: string[]) {
  let { rep, initialFacts } = useReplicache();
  let ratioFrom = (data?: { width: number; height: number }) =>
    data && data.width > 0 && data.height > 0 ? data.width / data.height : 1;
  let live = useSubscribe(
    rep,
    async (tx) =>
      Promise.all(
        entityIDs.map(async (id) => {
          let [image] = await scanIndex(tx).eav(id, "block/image");
          return ratioFrom(image?.data);
        }),
      ),
    { default: null, dependencies: [entityIDs.join(",")] },
  );
  if (live && live.length === entityIDs.length) return live;
  return entityIDs.map((id) => {
    let fact = initialFacts.find(
      (f) => f.entity === id && f.attribute === "block/image",
    );
    return ratioFrom(fact?.data as { width: number; height: number });
  });
}

// Resolves the best available source for a gallery child image entity. Prefers
// the in-memory object URL while an upload is in flight, like ImageBlock.
export function useGalleryImage(entityID: string) {
  let image = useEntity(entityID, "block/image");
  let alt = useEntity(entityID, "image/alt")?.data.value;
  if (!image) return null;
  let localSrc = localImages.get(image.data.src);
  return {
    src: localSrc ?? image.data.src,
    factSrc: image.data.src,
    alt: alt || "",
    width: image.data.width,
    height: image.data.height,
  };
}
