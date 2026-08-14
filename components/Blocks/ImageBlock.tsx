"use client";

import { useEntity, useReplicache } from "src/replicache";
import { BlockProps, BlockLayout } from "./Block";
import { useIsBlockSelected } from "src/useUIState";
import Image from "next/image";
import { useEntitySetContext } from "components/EntitySetProvider";
import { addImage, localImages } from "src/utils/addImage";
import { useImageLoadStatus } from "components/ImageLoadState";
import { ImageStatusOverlay } from "./ImageStatusOverlay";
import { useImageUploadStatus } from "src/utils/imageUploadStatus";
import { addBlockBelow } from "src/utils/addBlockBelow";
import { elementId } from "src/utils/elementId";
import { useEffect, useState } from "react";
import { BlockImageSmall } from "components/Icons/BlockImageSmall";
import { ImageAltButton } from "./ImageAltButton";
import { ImageOptions } from "./ImageOptions";
import {
  ImageGalleryLightbox,
  EditorLightboxSlide,
} from "./ImageGalleryBlock/ImageGalleryLightbox";
import { getPostImageEntities } from "./ImageGalleryBlock/getPostImages";

export function ImageBlock(props: BlockProps & { preview?: boolean }) {
  let { rep, undoManager } = useReplicache();
  let image = useEntity(props.entityID, "block/image");
  let entity_set = useEntitySetContext();
  let isSelected = useIsBlockSelected(props.entityID);
  let isFullBleed = useEntity(props.entityID, "image/full-bleed")?.data.value;
  let maxWidth = useEntity(props.entityID, "image/max-width")?.data.value;
  // Live width while the settings slider is being dragged, before it commits to
  // the fact; null hands rendering back to the committed value.
  let [previewWidth, setPreviewWidth] = useState<number | null>(null);
  let isFirst = props.previousBlock === null;
  let isLast = props.nextBlock === null;

  let altText = useEntity(props.entityID, "image/alt")?.data.value;

  let imageSrc = image?.data.src;
  let localSrc = imageSrc ? localImages.get(imageSrc) : undefined;
  // Editor previews are inert; leaving uploadSrc unset keeps their overlays off.
  let uploadSrc = !props.preview ? imageSrc : undefined;
  let uploadFailed = useImageUploadStatus((s) =>
    uploadSrc ? s.uploads[uploadSrc]?.state === "failed" : false,
  );
  let [reloads, setReloads] = useState(0);
  let {
    status: loadStatus,
    imgProps,
    reset: resetLoadStatus,
  } = useImageLoadStatus(localSrc ?? imageSrc);

  let retryImage = () => {
    resetLoadStatus();
    setReloads((r) => r + 1);
  };

  // Snapshot of every image in the post, taken the first time the lightbox
  // opens, so it can page through them all (gallery images included) starting on
  // the one that was opened.
  let [lightbox, setLightbox] = useState<{
    ids: string[];
    index: number;
    altExpanded?: boolean;
  } | null>(null);

  // Writers select the block first; a second click on the image opens the
  // lightbox. Readers (no write permission) open it on the first click.
  let canOpenLightbox =
    !props.preview && (!entity_set.permissions.write || !!isSelected);

  let openLightbox = (opts?: { altExpanded?: boolean }) => {
    let ids = rep ? getPostImageEntities(rep, props.parent) : [];
    let index = ids.indexOf(props.entityID);
    // Fall back to just this image if it isn't in the gathered list (e.g. on the
    // canvas, or before the write has settled).
    if (index === -1) {
      ids = [props.entityID];
      index = 0;
    }
    setLightbox({ ids, index, altExpanded: opts?.altExpanded });
  };

  let nextIsFullBleed = useEntity(
    props.nextBlock && props.nextBlock.entityID,
    "image/full-bleed",
  )?.data.value;
  let prevIsFullBleed = useEntity(
    props.previousBlock && props.previousBlock.entityID,
    "image/full-bleed",
  )?.data.value;

  useEffect(() => {
    if (props.preview) return;
    let input = document.getElementById(elementId.block(props.entityID).input);
    if (isSelected) {
      input?.focus();
    } else {
      input?.blur();
    }
  }, [isSelected, props.preview, props.entityID]);

  const handleImageUpload = async (file: File) => {
    if (!rep) return;
    await undoManager.withUndoGroup(async () => {
      let entity = props.entityID;
      if (!entity) {
        entity = await addBlockBelow(rep, {
          parent: props.parent,
          position: props.position,
          nextPosition: props.nextPosition,
          permission_set: entity_set.set,
          type: "text",
        });
      }
      await rep.mutate.assertFact({
        entity,
        attribute: "block/type",
        data: { type: "block-type-union", value: "image" },
      });
      await addImage(file, rep, {
        entityID: entity,
        attribute: "block/image",
      });
    });
  };

  if (!image) {
    if (!entity_set.permissions.write) return null;
    return (
      <BlockLayout
        hasBackground="accent"
        isSelected={!!isSelected}
        borderOnHover
        className={` group/image-block text-tertiary hover:text-accent-contrast hover:font-bold h-[104px]  border-dashed rounded-lg `}
      >
        <label
          className={`
            w-full h-full hover:cursor-pointer
            flex flex-col items-center justify-center
           `}
          onMouseDown={(e) => e.preventDefault()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
              const file = files[0];
              if (file.type.startsWith("image/")) {
                await handleImageUpload(file);
              }
            }
          }}
        >
          <div className="flex gap-2">
            <BlockImageSmall
              className={`shrink-0 group-hover/image-block:text-accent-contrast ${isSelected ? "text-tertiary" : "text-border"}`}
            />
            Upload An Image
          </div>
          <input
            className="h-0 w-0 hidden"
            type="file"
            accept="image/*"
            onChange={async (e) => {
              let file = e.currentTarget.files?.[0];
              if (!file) return;
              await handleImageUpload(file);
            }}
          />
        </label>
      </BlockLayout>
    );
  }

  let blockClassName = `
    relative group/image border-transparent! p-0!
    ${
      isFullBleed
        ? "w-[calc(100%+28px)]! sm:w-[calc(100%+36px)]! -mx-[14px] sm:-mx-[18px] rounded-[0px]! sm:outline-offset-[-16px]! -outline-offset[-12px]!"
        : "w-fit!"
    }
    ${isFullBleed ? (isFirst ? "-mt-3 sm:-mt-4" : prevIsFullBleed ? "-mt-[5px]" : "") : ""}
    ${isFullBleed ? (isLast ? "-mb-4" : nextIsFullBleed ? "-mb-[9px]" : "") : ""}
    `;

  let displayWidth = previewWidth ?? maxWidth;
  let imageStyle =
    displayWidth && !isFullBleed
      ? { width: displayWidth, maxWidth: "100%", height: "auto" as const }
      : undefined;

  return (
    <BlockLayout
      hasAlignment={!isFullBleed}
      isSelected={!!isSelected}
      className={blockClassName}
      optionsClassName={isFullBleed ? "top-[-8px]! border-none!" : ""}
      extraOptions={
        !props.preview ? (
          <ImageOptions
            entityID={props.entityID}
            onPreviewWidth={setPreviewWidth}
          />
        ) : undefined
      }
    >
      <div
        className={`relative ${isFullBleed ? "w-full" : "w-fit"} ${loadStatus === "error" || uploadFailed ? "min-w-40 min-h-24" : ""}`}
      >
        <button
          type="button"
          className={`block ${isFullBleed ? "w-full" : "w-fit"} ${canOpenLightbox ? "cursor-zoom-in" : ""}`}
          onClick={() => {
            if (canOpenLightbox) openLightbox();
          }}
        >
          {localSrc || image.data.local ? (
            <img
              {...imgProps}
              key={reloads}
              loading="lazy"
              decoding="async"
              alt={altText}
              src={localSrc ?? image.data.fallback}
              height={image?.data.height}
              width={image?.data.width}
              className={isFullBleed ? "w-full" : undefined}
              style={imageStyle}
            />
          ) : (
            <Image
              {...imgProps}
              key={reloads}
              alt={altText || ""}
              src={
                "/" +
                new URL(image.data.src).pathname.split("/").slice(5).join("/")
              }
              height={image?.data.height}
              width={image?.data.width}
              className={isFullBleed ? "w-full" : undefined}
              style={imageStyle}
            />
          )}
        </button>
        <ImageStatusOverlay
          uploadSrc={uploadSrc}
          loadStatus={loadStatus}
          onReload={retryImage}
          className={isFullBleed ? "rounded-none!" : "rounded-lg!"}
        />
      </div>
      {!props.preview && (
        <ImageGalleryLightbox
          count={lightbox?.ids.length ?? 0}
          index={lightbox?.index ?? null}
          altExpanded={lightbox?.altExpanded}
          onIndexChange={(i) => {
            if (i === null) setLightbox(null);
          }}
          renderSlide={(i) =>
            lightbox ? <EditorLightboxSlide entityID={lightbox.ids[i]} /> : null
          }
        />
      )}
      {!props.preview ? (
        <ImageAltButton
          entityID={props.entityID}
          selected={!!isSelected}
          canEdit={entity_set.permissions.write}
          onSeeMore={() => openLightbox({ altExpanded: true })}
        />
      ) : null}
    </BlockLayout>
  );
}
