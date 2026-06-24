"use client";

import { useEntity, useReplicache } from "src/replicache";
import { BlockProps, BlockLayout } from "../Block";
import { useUIState } from "src/useUIState";
import { useEntitySetContext } from "components/EntitySetProvider";
import { addImage } from "src/utils/addImage";
import { useState } from "react";
import { v7 } from "uuid";

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

export function ImageGalleryBlock(props: BlockProps & { preview?: boolean }) {
  let { rep, undoManager } = useReplicache();
  let entity_set = useEntitySetContext();
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.value),
  );

  let imageFacts = useEntity(props.value, "gallery/image");
  let format =
    useEntity(props.value, "gallery/format")?.data.value ?? DEFAULT_FORMAT;
  let gap = useEntity(props.value, "gallery/gap")?.data.value ?? DEFAULT_GAP;
  let maxWidth =
    useEntity(props.value, "gallery/max-width")?.data.value ??
    DEFAULT_MAX_WIDTH;

  let [editOpen, setEditOpen] = useState(false);
  let [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  let imageEntities = imageFacts.map((f) => f.data.value);

  const handleFiles = async (files: File[]) => {
    if (!rep) return;
    await undoManager.withUndoGroup(async () => {
      for (let file of files) {
        if (!file.type.startsWith("image/")) continue;
        let imageEntity = v7();
        await rep.mutate.addGalleryImage({
          galleryEntity: props.value,
          imageEntity,
          factID: v7(),
          permission_set: entity_set.set,
        });
        if (file.name)
          await rep.mutate.assertFact({
            entity: imageEntity,
            attribute: "image/name",
            data: { type: "string", value: file.name },
          });
        await addImage(file, rep, {
          entityID: imageEntity,
          attribute: "block/image",
        });
      }
    });
  };

  // Writers select the block first; a second click on an image opens the
  // lightbox. Readers (no write permission) open it on the first click.
  let canOpenLightbox =
    !props.preview && (!entity_set.permissions.write || !!isSelected);
  let openLightbox = (index: number) => {
    if (canOpenLightbox) setLightboxIndex(index);
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
            entityID={props.value}
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
              {...classes}
            />
          )}
        />
      )}

      {!props.preview && (
        <EditGalleryImages
          entityID={props.value}
          imageFacts={imageFacts}
          open={editOpen}
          onOpenChange={setEditOpen}
          onAddFiles={handleFiles}
        />
      )}

      <ImageGalleryLightbox
        count={imageEntities.length}
        index={lightboxIndex}
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
