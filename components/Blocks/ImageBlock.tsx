"use client";

import { useEntity, useReplicache } from "src/replicache";
import { BlockProps, BlockLayout } from "./Block";
import { useUIState } from "src/useUIState";
import Image from "next/image";
import { v7 } from "uuid";
import { useEntitySetContext } from "components/EntitySetProvider";
import { generateKeyBetween } from "fractional-indexing";
import { addImage, localImages } from "src/utils/addImage";
import { elementId } from "src/utils/elementId";
import { createContext, useContext, useEffect, useState } from "react";
import { BlockImageSmall } from "components/Icons/BlockImageSmall";
import { Popover } from "components/Popover";
import { theme } from "tailwind.config";
import { EditTiny } from "components/Icons/EditTiny";
import { AsyncValueAutosizeTextarea } from "components/utils/AutosizeTextarea";
import { set } from "colorjs.io/fn";
import { ImageAltSmall } from "components/Icons/ImageAlt";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useSubscribe } from "src/replicache/useSubscribe";
import { ImageCoverImage } from "components/Icons/ImageCoverImage";

export function ImageBlock(props: BlockProps & { preview?: boolean }) {
  let { rep } = useReplicache();
  let image = useEntity(props.value, "block/image");
  let entity_set = useEntitySetContext();
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.value),
  );
  let isFullBleed = useEntity(props.value, "image/full-bleed")?.data.value;
  let isFirst = props.previousBlock === null;
  let isLast = props.nextBlock === null;

  let altText = useEntity(props.value, "image/alt")?.data.value;

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
  };

  if (!image) {
    if (!entity_set.permissions.write) return null;
    return (
      <BlockLayout
        hasBackground="accent"
        isSelected={!!isSelected}
        borderOnHover
        className=" group/image-block text-tertiary hover:text-accent-contrast hover:font-bold h-[104px]  border-dashed rounded-lg"
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

  let isLocalUpload = localImages.get(image.data.src);

  let blockClassName = `
    relative group/image border-transparent! p-0! w-fit!
    ${isFullBleed && "-mx-[14px] sm:-mx-[18px] rounded-[0px]! sm:outline-offset-[-16px]! -outline-offset[-12px]!"}
    ${isFullBleed ? (isFirst ? "-mt-3 sm:-mt-4" : prevIsFullBleed ? "-mt-1" : "") : ""}
    ${isFullBleed ? (isLast ? "-mb-4" : nextIsFullBleed ? "-mb-2" : "") : ""}
    `;

  return (
    <BlockLayout
      hasAlignment
      isSelected={!!isSelected}
      className={blockClassName}
      optionsClassName={isFullBleed ? "top-[-8px]!" : ""}
    >
      {isLocalUpload || image.data.local ? (
        <img
          loading="lazy"
          decoding="async"
          alt={altText}
          src={isLocalUpload ? image.data.src + "?local" : image.data.fallback}
          height={image?.data.height}
          width={image?.data.width}
        />
      ) : (
        <Image
          alt={altText || ""}
          src={
            "/" + new URL(image.data.src).pathname.split("/").slice(5).join("/")
          }
          height={image?.data.height}
          width={image?.data.width}
        />
      )}
      {altText !== undefined && !props.preview ? (
        <ImageAlt entityID={props.value} />
      ) : null}
      {!props.preview ? <CoverImageButton entityID={props.value} /> : null}
    </BlockLayout>
  );
}

export const FullBleedSelectionIndicator = () => {
  return (
    <div
      className={`absolute top-3 sm:top-4 bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 border-2 border-bg-page rounded-lg outline-offset-1 outline-solid outline-2 outline-tertiary`}
    />
  );
};

export const ImageBlockContext = createContext({
  altEditorOpen: false,
  setAltEditorOpen: (s: boolean) => {},
});

const CoverImageButton = (props: { entityID: string }) => {
  let { rep } = useReplicache();
  let entity_set = useEntitySetContext();
  let { data: pubData } = useLeafletPublicationData();
  let coverImage = useSubscribe(rep, (tx) =>
    tx.get<string | null>("publication_cover_image"),
  );
  let isFocused = useUIState(
    (s) => s.focusedEntity?.entityID === props.entityID,
  );

  // Only show if focused, in a publication, has write permissions, and no cover image is set
  if (
    !isFocused ||
    !pubData?.publications ||
    !entity_set.permissions.write ||
    coverImage
  )
    return null;

  return (
    <div className="absolute top-2 left-2">
      <button
        className="flex items-center gap-1 text-xs bg-bg-page/80 hover:bg-bg-page text-secondary hover:text-primary px-2 py-1 rounded-md border border-border hover:border-primary transition-colors"
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await rep?.mutate.updatePublicationDraft({
            cover_image: props.entityID,
          });
        }}
      >
        <span className="w-4 h-4 flex items-center justify-center">
          <ImageCoverImage />
        </span>
        Set as Cover
      </button>
    </div>
  );
};

const ImageAlt = (props: { entityID: string }) => {
  let { rep } = useReplicache();
  let altText = useEntity(props.entityID, "image/alt")?.data.value;
  let entity_set = useEntitySetContext();

  let setAltEditorOpen = useUIState((s) => s.setOpenPopover);
  let altEditorOpen = useUIState((s) => s.openPopover === props.entityID);

  if (!entity_set.permissions.write && altText === "") return null;
  return (
    <div className="absolute bottom-0 right-2 h-max">
      <Popover
        open={altEditorOpen}
        className="text-sm max-w-xs  min-w-0"
        side="left"
        asChild
        trigger={
          <button
            onClick={() =>
              setAltEditorOpen(altEditorOpen ? null : props.entityID)
            }
          >
            <ImageAltSmall fillColor={theme.colors["bg-page"]} />
          </button>
        }
      >
        {entity_set.permissions.write ? (
          <AsyncValueAutosizeTextarea
            className="text-sm text-secondary outline-hidden bg-transparent min-w-0"
            value={altText}
            onFocus={(e) => {
              e.currentTarget.setSelectionRange(
                e.currentTarget.value.length,
                e.currentTarget.value.length,
              );
            }}
            onChange={async (e) => {
              await rep?.mutate.assertFact({
                entity: props.entityID,
                attribute: "image/alt",
                data: { type: "string", value: e.currentTarget.value },
              });
            }}
            placeholder="add alt text..."
          />
        ) : (
          <div className="text-sm text-secondary w-full"> {altText}</div>
        )}
      </Popover>
    </div>
  );
};
