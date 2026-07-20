import { create } from "zustand";
import { combine } from "zustand/middleware";
import { GalleryImage } from "components/Blocks/ImageGalleryBlock/shared";

// A published post's image lightbox is a singleton — only one is ever open — so
// its state lives in a global store. The page publishes its gathered images as
// the `source` (keyed by each image block's index-path); a standalone image
// block opens the lightbox on itself with `openAt`, and a single
// GlobalImageLightbox renders `lightbox`. `lightbox === null` means closed, and
// `source === null` means the current surface has no lightbox (e.g. a
// publication page), so image blocks there aren't clickable.
export const useImageLightbox = create(
  combine(
    {
      lightbox: null as { images: GalleryImage[]; index: number } | null,
      source: null as {
        images: GalleryImage[];
        offsets: Map<string, number>;
      } | null,
    },
    (set, get) => ({
      setSource: (
        source: { images: GalleryImage[]; offsets: Map<string, number> } | null,
      ) => set({ source }),
      openAt: (key: string) => {
        let source = get().source;
        let index = source?.offsets.get(key);
        if (source && index !== undefined)
          set({ lightbox: { images: source.images, index } });
      },
      close: () => set({ lightbox: null }),
    }),
  ),
);
