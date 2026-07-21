import { create } from "zustand";
import { combine } from "zustand/middleware";
import { GalleryImage } from "components/Blocks/ImageGalleryBlock/shared";

type Source = { images: GalleryImage[]; offsets: Map<string, number> };

// A published post's image lightbox is a singleton — only one is ever open —
// so `lightbox` stays a single global value. But the document viewer can have
// several pages mounted at once (the main page plus any subpages opened
// inline), each with its own set of images, so `sources` is keyed per page
// (see pageId ?? "" in LinearDocumentPage/CanvasPage/PostContent) rather than
// a single slot — otherwise the most-recently-mounted page's images would
// silently take over every other page's lightbox.
export const useImageLightbox = create(
  combine(
    {
      lightbox: null as { images: GalleryImage[]; index: number } | null,
      sources: new Map<string, Source>(),
    },
    (set, get) => ({
      setSource: (pageKey: string, source: Source | null) => {
        let sources = new Map(get().sources);
        if (source) sources.set(pageKey, source);
        else sources.delete(pageKey);
        set({ sources });
      },
      openAt: (pageKey: string, key: string) => {
        let source = get().sources.get(pageKey);
        let index = source?.offsets.get(key);
        if (source && index !== undefined)
          set({ lightbox: { images: source.images, index } });
      },
      close: () => set({ lightbox: null }),
    }),
  ),
);
