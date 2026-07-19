"use client";
import { useMemo, useState } from "react";
import { PubLeafletBlocksImageGallery } from "lexicons/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { ReadOnlyAltText } from "components/Blocks/ReadOnlyAltText";
import {
  DEFAULT_FORMAT,
  DEFAULT_GAP,
  DEFAULT_MAX_WIDTH,
  GalleryImage,
  GalleryItemClasses,
} from "components/Blocks/ImageGalleryBlock/shared";
import { GalleryImageItem } from "components/Blocks/ImageGalleryBlock/GalleryImageItem";
import { ImageGalleryGrid } from "components/Blocks/ImageGalleryBlock/ImageGalleryGrid";
import { ImageGalleryStrip } from "components/Blocks/ImageGalleryBlock/ImageGalleryStrip";
import { ImageGalleryCarousel } from "components/Blocks/ImageGalleryBlock/ImageGalleryCarousel";
import {
  ImageGalleryLightbox,
  LightboxSlide,
} from "components/Blocks/ImageGalleryBlock/ImageGalleryLightbox";

function toImage(
  i: PubLeafletBlocksImageGallery.Image,
  did: string,
  transform?: Parameters<typeof blobRefToSrc>[3],
): GalleryImage {
  return {
    src: blobRefToSrc(i.image.ref, did, undefined, transform),
    alt: i.alt || "",
    width: i.aspectRatio.width,
    height: i.aspectRatio.height,
  };
}

export function PublishedImageGallery(props: {
  block: PubLeafletBlocksImageGallery.Main;
  did: string;
}) {
  let { block, did } = props;
  // Grid/strip/carousel cells get the 1200 tier (document-body column at
  // retina density); the lightbox gets the full-resolution blob, built
  // per-slide only when it's actually opened.
  let images = useMemo<GalleryImage[]>(
    () => block.images.map((i) => toImage(i, did, { width: 1200 })),
    [block.images, did],
  );

  let [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  let openLightbox = (index: number) => setLightboxIndex(index);

  let format = block.format ?? DEFAULT_FORMAT;
  let gap = block.gap ?? DEFAULT_GAP;
  let maxWidth = block.maxWidth ?? DEFAULT_MAX_WIDTH;

  if (images.length === 0) return null;

  let renderItem = (i: number, classes: GalleryItemClasses) => (
    <GalleryImageItem
      image={images[i]}
      onClick={() => openLightbox(i)}
      overlay={<ReadOnlyAltText alt={images[i].alt} />}
      {...classes}
    />
  );

  return (
    <div className="imageGalleryBlock w-full">
      {format === "carousel" ? (
        <ImageGalleryCarousel count={images.length} renderItem={renderItem} />
      ) : format === "strip" ? (
        <ImageGalleryStrip
          count={images.length}
          gap={gap}
          renderItem={renderItem}
        />
      ) : (
        <ImageGalleryGrid
          count={images.length}
          gap={gap}
          maxWidth={maxWidth}
          renderItem={renderItem}
        />
      )}

      <ImageGalleryLightbox
        count={images.length}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        renderSlide={(i) => (
          <LightboxSlide image={toImage(block.images[i], did)} />
        )}
      />
    </div>
  );
}
