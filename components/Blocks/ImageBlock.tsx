"use client";

import { useEntity, useReplicache } from "src/replicache";
import { BlockProps, BlockLayout } from "./Block";
import { useUIState } from "src/useUIState";
import Image from "next/image";
import { v7 } from "uuid";
import { useEntitySetContext } from "components/EntitySetProvider";
import { generateKeyBetween } from "fractional-indexing";
import { addImage, localImages } from "src/utils/addImage";
import { setCoverImageFromEntity } from "src/utils/setCoverImageFromEntity";
import { elementId } from "src/utils/elementId";
import { useEffect, useState } from "react";
import { BlockImageSmall } from "components/Icons/BlockImageSmall";
import { EditTiny } from "components/Icons/EditTiny";
import { set } from "colorjs.io/fn";
import { ImageAltButton } from "./ImageAltButton";
import {
  ImageGalleryLightbox,
  EditorLightboxSlide,
} from "./ImageGalleryBlock/ImageGalleryLightbox";
import { getPostImageEntities } from "./ImageGalleryBlock/getPostImages";
import {
  useLeafletPublicationData,
  useLeafletPublicationPage,
} from "components/PageSWRDataProvider";
import {
  ImageCoverImage,
  ImageCoverImageRemove,
} from "components/Icons/ImageCoverImage";
import {
  ButtonPrimary,
  ButtonSecondary,
  ButtonTertiary,
} from "components/Buttons";
import { CheckTiny } from "components/Icons/CheckTiny";

export function ImageBlock(props: BlockProps & { preview?: boolean }) {
  let { rep, undoManager } = useReplicache();
  let image = useEntity(props.value, "block/image");
  let entity_set = useEntitySetContext();
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.value),
  );
  let isFullBleed = useEntity(props.value, "image/full-bleed")?.data.value;
  let isFirst = props.previousBlock === null;
  let isLast = props.nextBlock === null;

  let altText = useEntity(props.value, "image/alt")?.data.value;

  // Snapshot of every image in the post, taken the first time the lightbox
  // opens, so it can page through them all (gallery images included) starting on
  // the one that was opened.
  let [lightbox, setLightbox] = useState<{
    ids: string[];
    index: number;
  } | null>(null);

  // Writers select the block first; a second click on the image opens the
  // lightbox. Readers (no write permission) open it on the first click.
  let canOpenLightbox =
    !props.preview && (!entity_set.permissions.write || !!isSelected);

  let openLightbox = async () => {
    let ids =
      (await rep?.query((tx) => getPostImageEntities(tx, props.parent))) ?? [];
    let index = ids.indexOf(props.value);
    // Fall back to just this image if it isn't in the gathered list (e.g. on the
    // canvas, or before the write has settled).
    if (index === -1) {
      ids = [props.value];
      index = 0;
    }
    setLightbox({ ids, index });
  };

  let nextIsFullBleed = useEntity(
    props.nextBlock && props.nextBlock.value,
    "image/full-bleed",
  )?.data.value;
  let prevIsFullBleed = useEntity(
    props.previousBlock && props.previousBlock.value,
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
        entity = v7();
        await rep?.mutate.addBlock({
          parent: props.parent,
          factID: v7(),
          permission_set: entity_set.set,
          type: "text",
          position: generateKeyBetween(props.position, props.nextPosition),
          newEntityID: entity,
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

  let localSrc = localImages.get(image.data.src);

  let blockClassName = `
    relative group/image border-transparent! p-0! w-fit!
    ${isFullBleed && "-mx-[14px] sm:-mx-[18px] rounded-[0px]! sm:outline-offset-[-16px]! -outline-offset[-12px]!"}
    ${isFullBleed ? (isFirst ? "-mt-3 sm:-mt-4" : prevIsFullBleed ? "-mt-[5px]" : "") : ""}
    ${isFullBleed ? (isLast ? "-mb-4" : nextIsFullBleed ? "-mb-[9px]" : "") : ""}
    `;

  return (
    <BlockLayout
      hasAlignment
      isSelected={!!isSelected}
      className={blockClassName}
      optionsClassName={isFullBleed ? "top-[-8px]! border-none!" : ""}
    >
      <button
        type="button"
        className={`block w-fit ${canOpenLightbox ? "cursor-zoom-in" : ""}`}
        onClick={() => {
          if (canOpenLightbox) openLightbox();
        }}
      >
        {localSrc || image.data.local ? (
          <img
            loading="lazy"
            decoding="async"
            alt={altText}
            src={localSrc ?? image.data.fallback}
            height={image?.data.height}
            width={image?.data.width}
          />
        ) : (
          <Image
            alt={altText || ""}
            src={
              "/" +
              new URL(image.data.src).pathname.split("/").slice(5).join("/")
            }
            height={image?.data.height}
            width={image?.data.width}
          />
        )}
      </button>
      {!props.preview && (
        <ImageGalleryLightbox
          count={lightbox?.ids.length ?? 0}
          index={lightbox?.index ?? null}
          onIndexChange={(i) => {
            if (i === null) setLightbox(null);
          }}
          renderSlide={(i) =>
            lightbox ? (
              <EditorLightboxSlide entityID={lightbox.ids[i]} />
            ) : null
          }
        />
      )}
      {!props.preview ? (
        <ImageAltButton
          entityID={props.value}
          selected={!!isSelected}
          canEdit={entity_set.permissions.write}
        />
      ) : null}
      {!props.preview ? <CoverImageButton entityID={props.value} /> : null}
    </BlockLayout>
  );
}

const CoverImageButton = (props: { entityID: string }) => {
  let { rep, rootEntity } = useReplicache();
  let entity_set = useEntitySetContext();
  let { data: pubData } = useLeafletPublicationData();
  let publicationPage = useLeafletPublicationPage();
  let image = useEntity(props.entityID, "block/image");
  let alt = useEntity(props.entityID, "image/alt")?.data.value;
  let coverEntity = useEntity(rootEntity, "root/cover-image")?.data.value;
  let coverImage = useEntity(coverEntity ?? null, "block/image");
  let isFocused = useUIState(
    (s) => s.focusedEntity?.entityID === props.entityID,
  );

  // Only show if focused, in a publication, with write permissions, and an
  // image to copy. Publication pages (e.g. an About page) have no cover image.
  if (
    !isFocused ||
    !pubData?.publications ||
    !entity_set.permissions.write ||
    publicationPage ||
    !image
  )
    return null;

  // The cover is a standalone copy sharing this block's src, so a matching src
  // means this block is the current cover.
  let isCoverImage = !!coverImage && coverImage.data.src === image.data.src;
  if (isCoverImage)
    return (
      <ButtonSecondary
        className="absolute top-2 right-2"
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (coverEntity)
            await rep?.mutate.deleteEntity({ entity: coverEntity });
        }}
      >
        Remove Cover Image
        <ImageCoverImageRemove />
      </ButtonSecondary>
    );

  return (
    <ButtonPrimary
      className="absolute top-2 right-2"
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!rep) return;
        await setCoverImageFromEntity(rep, {
          rootEntity,
          permission_set: entity_set.set,
          image: image.data,
          alt,
        });
      }}
    >
      Use as Cover Image
      <ImageCoverImage />
    </ButtonPrimary>
  );
};
