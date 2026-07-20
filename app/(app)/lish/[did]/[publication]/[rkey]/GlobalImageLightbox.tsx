"use client";
import { useImageLightbox } from "src/useImageLightbox";
import {
  ImageGalleryLightbox,
  LightboxSlide,
} from "components/Blocks/ImageGalleryBlock/ImageGalleryLightbox";

// Mounted once per published post route; standalone image blocks drive it
// through the useImageLightbox store.
export function GlobalImageLightbox() {
  let lightbox = useImageLightbox((s) => s.lightbox);
  let close = useImageLightbox((s) => s.close);
  return (
    <ImageGalleryLightbox
      count={lightbox?.images.length ?? 0}
      index={lightbox?.index ?? null}
      onIndexChange={(i) => {
        if (i === null) close();
      }}
      renderSlide={(i) =>
        lightbox ? <LightboxSlide image={lightbox.images[i]} /> : null
      }
    />
  );
}
