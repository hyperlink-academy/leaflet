"use client";
import { createContext, useCallback, useContext, useState } from "react";
import {
  PubLeafletPagesLinearDocument,
  PubLeafletPagesCanvas,
} from "lexicons/api";
import { useLeafletContent } from "contexts/LeafletContentContext";
import { collectPostImages, PostImage } from "./collectPostImages";
import {
  ImageGalleryLightbox,
  LightboxSlide,
} from "components/Blocks/ImageGalleryBlock/ImageGalleryLightbox";

type Page = PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main;

const OpenLightboxContext = createContext<
  | ((
      pageId: string | undefined,
      cid: string,
      opts?: { altExpanded?: boolean },
    ) => void)
  | null
>(null);

// Null on surfaces without a GlobalImageLightbox (publication pages), which is
// what makes images there non-clickable.
export const useOpenImageLightbox = () => useContext(OpenLightboxContext);

// Wraps the published post route; standalone image blocks open the lightbox
// via useOpenImageLightbox with their page and blob CID, and every image on
// that page is resolved here so the lightbox can page through them all.
export function GlobalImageLightbox(props: {
  did: string;
  children: React.ReactNode;
}) {
  let [lightbox, setLightbox] = useState<{
    images: PostImage[];
    index: number;
    altExpanded?: boolean;
  } | null>(null);
  const { pages } = useLeafletContent();

  let openAt = useCallback(
    (
      pageId: string | undefined,
      cid: string,
      opts?: { altExpanded?: boolean },
    ) => {
      let page = pageId
        ? (pages as Page[]).find((p) => p.id === pageId)
        : (pages[0] as Page | undefined);
      let images = page ? collectPostImages(page, props.did) : [];
      let index = images.findIndex((i) => i.cid === cid);
      if (index !== -1)
        setLightbox({ images, index, altExpanded: opts?.altExpanded });
    },
    [pages, props.did],
  );

  return (
    <OpenLightboxContext.Provider value={openAt}>
      {props.children}
      <ImageGalleryLightbox
        count={lightbox?.images.length ?? 0}
        index={lightbox?.index ?? null}
        altExpanded={lightbox?.altExpanded}
        onIndexChange={(i) => {
          if (i === null) setLightbox(null);
        }}
        renderSlide={(i) =>
          lightbox ? <LightboxSlide image={lightbox.images[i]} /> : null
        }
      />
    </OpenLightboxContext.Provider>
  );
}
