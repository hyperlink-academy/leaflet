"use client";
import { useMemo, useState } from "react";
import { PubLeafletBlocksImageGallery } from "lexicons/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { Popover } from "components/Popover";
import { theme } from "tailwind.config";
import { ImageAltSmall } from "components/Icons/ImageAlt";
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

export function PublishedImageGallery(props: {
  block: PubLeafletBlocksImageGallery.Main;
  did: string;
}) {
  let { block, did } = props;
  let images = useMemo<GalleryImage[]>(
    () =>
      block.images.map((i) => ({
        src: blobRefToSrc(i.image.ref, did),
        alt: i.alt || "",
        width: i.aspectRatio.width,
        height: i.aspectRatio.height,
      })),
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
      overlay={<AltPopover alt={images[i].alt} />}
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
        renderSlide={(i) => <LightboxSlide image={images[i]} />}
      />
    </div>
  );
}

// Read-only alt overlay, mirroring the published single-image block.
function AltPopover(props: { alt: string }) {
  if (!props.alt) return null;
  return (
    <div className="absolute bottom-1.5 right-2 h-max">
      <Popover
        className="text-sm max-w-xs min-w-0"
        side="left"
        trigger={<ImageAltSmall fillColor={theme.colors["bg-page"]} />}
      >
        <div className="text-sm text-secondary w-full">{props.alt}</div>
      </Popover>
    </div>
  );
}
