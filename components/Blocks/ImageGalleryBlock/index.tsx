"use client";

import { useEntity, useReplicache } from "src/replicache";
import { BlockProps, BlockLayout } from "../Block";
import { useIsBlockSelected } from "src/useUIState";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useState } from "react";
import { addGalleryImages } from "./addGalleryImages";
import { useBlockImagePaste } from "../useBlockImagePaste";

import { BlockImageSmall } from "components/Icons/BlockImageSmall";

import { DEFAULT_GAP, DEFAULT_FORMAT, DEFAULT_MAX_WIDTH } from "./shared";
import { ImageGalleryGrid } from "./ImageGalleryGrid";
import { ImageGalleryStrip } from "./ImageGalleryStrip";
import { ImageGalleryCarousel } from "./ImageGalleryCarousel";
import {
  ImageGalleryLightbox,
  EditorLightboxSlide,
} from "./ImageGalleryLightbox";
import { EditorGalleryImageItem } from "./GalleryImageItem";
import { ImageGalleryOptions, EditGalleryImages } from "./ImageGalleryOptions";
import { useCanOpenLightbox } from "./useCanOpenLightbox";

export function ImageGalleryBlock(props: BlockProps & { preview?: boolean }) {
  let { rep } = useReplicache();
  let entity_set = useEntitySetContext();
  let isSelected = useIsBlockSelected(props.entityID);

  let imageFacts = useEntity(props.entityID, "gallery/image");
  let format =
    useEntity(props.entityID, "gallery/format")?.data.value ?? DEFAULT_FORMAT;
  let gap = useEntity(props.entityID, "gallery/gap")?.data.value ?? DEFAULT_GAP;
  let maxWidth =
    useEntity(props.entityID, "gallery/max-width")?.data.value ??
    DEFAULT_MAX_WIDTH;

  let [editOpen, setEditOpen] = useState(false);
  let [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  let [lightboxAltExpanded, setLightboxAltExpanded] = useState(false);

  let imageEntities = imageFacts.map((f) => f.data.value);

  const handleFiles = async (files: File[]) => {
    if (!rep) return;
    await addGalleryImages(rep, {
      galleryEntity: props.entityID,
      permission_set: entity_set.set,
      files,
    });
  };

  useBlockImagePaste(
    props.entityID,
    !props.preview && !!isSelected && entity_set.permissions.write,
    handleFiles,
  );

  let { clickOpensLightbox } = useCanOpenLightbox({
    entityID: props.entityID,
    isSelected: !!isSelected,
    preview: props.preview,
  });
  let openLightbox = (index: number) => {
    if (clickOpensLightbox()) {
      setLightboxAltExpanded(false);
      setLightboxIndex(index);
    }
  };
  // Alt text too long for the on-image box hands off to the lightbox, whether or
  // not a plain click on the image would open it.
  let openLightboxWithAlt = (index: number) => {
    setLightboxAltExpanded(true);
    setLightboxIndex(index);
  };

  let editable = !props.preview && entity_set.permissions.write;

  if (imageEntities.length === 0) {
    if (!entity_set.permissions.write) return null;
    return (
      <BlockLayout
        hasBackground="accent"
        isSelected={!!isSelected}
        borderOnHover
        className="group/gallery-block text-tertiary hover:text-accent-contrast hover:font-bold h-[104px] border-dashed rounded-lg"
      >
        <GalleryUploadLabel
          onAddFiles={handleFiles}
          isSelected={!!isSelected}
        />
      </BlockLayout>
    );
  }

  return (
    <BlockLayout
      isSelected={!!isSelected}
      className="border-transparent! p-0! w-full rounded-none!"
      extraOptions={
        !props.preview ? (
          <ImageGalleryOptions
            entityID={props.entityID}
            format={format}
            gap={gap}
            maxWidth={maxWidth}
            onEditImages={() => setEditOpen(true)}
          />
        ) : undefined
      }
    >
      {format === "carousel" ? (
        <ImageGalleryCarousel
          count={imageEntities.length}
          renderItem={(i, classes) => (
            <EditorGalleryImageItem
              entityID={imageEntities[i]}
              editable={editable}
              selected={!!isSelected}
              onClick={() => openLightbox(i)}
              onSeeMoreAlt={() => openLightboxWithAlt(i)}
              {...classes}
            />
          )}
        />
      ) : format === "strip" ? (
        <ImageGalleryStrip
          count={imageEntities.length}
          gap={gap}
          renderItem={(i, classes) => (
            <EditorGalleryImageItem
              entityID={imageEntities[i]}
              editable={editable}
              selected={!!isSelected}
              onClick={() => openLightbox(i)}
              onSeeMoreAlt={() => openLightboxWithAlt(i)}
              {...classes}
            />
          )}
        />
      ) : (
        <ImageGalleryGrid
          count={imageEntities.length}
          gap={gap}
          maxWidth={maxWidth}
          renderItem={(i, classes) => (
            <EditorGalleryImageItem
              entityID={imageEntities[i]}
              editable={editable}
              selected={!!isSelected}
              onClick={() => openLightbox(i)}
              onSeeMoreAlt={() => openLightboxWithAlt(i)}
              {...classes}
            />
          )}
        />
      )}

      {!props.preview && (
        <EditGalleryImages
          entityID={props.entityID}
          imageFacts={imageFacts}
          open={editOpen}
          onOpenChange={setEditOpen}
          onAddFiles={handleFiles}
        />
      )}

      <ImageGalleryLightbox
        count={imageEntities.length}
        index={lightboxIndex}
        altExpanded={lightboxAltExpanded}
        onIndexChange={setLightboxIndex}
        renderSlide={(i) => <EditorLightboxSlide entityID={imageEntities[i]} />}
      />
    </BlockLayout>
  );
}

function GalleryUploadLabel(props: {
  onAddFiles: (files: File[]) => void;
  isSelected: boolean;
  children?: React.ReactNode;
}) {
  return (
    <label
      className="w-full h-full hover:cursor-pointer flex flex-col items-center justify-center"
      onMouseDown={(e) => e.preventDefault()}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        let files = Array.from(e.dataTransfer.files).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length > 0) props.onAddFiles(files);
      }}
    >
      {props.children ?? (
        <div className="flex gap-2">
          <BlockImageSmall
            className={`shrink-0 group-hover/gallery-block:text-accent-contrast ${props.isSelected ? "text-tertiary" : "text-border"}`}
          />
          Upload Images
        </div>
      )}
      <input
        className="h-0 w-0 hidden"
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          let files = Array.from(e.currentTarget.files || []);
          if (files.length > 0) props.onAddFiles(files);
          e.currentTarget.value = "";
        }}
      />
    </label>
  );
}
