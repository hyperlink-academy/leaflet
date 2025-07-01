"use client";

import { useEntity, useReplicache } from "src/replicache";
import { BlockProps } from "./Block";
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
import { ImageAltSmall } from "components/Toolbar/ImageToolbar";
import { theme } from "tailwind.config";
import { EditTiny } from "components/Icons/EditTiny";
import { AsyncValueAutosizeTextarea } from "components/utils/AutosizeTextarea";
import { set } from "colorjs.io/fn";

export function ImageBlock(props: BlockProps & { preview?: boolean }) {
  let { rep } = useReplicache();
  let image = useEntity(props.value, "block/image");
  let entity_set = useEntitySetContext();
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.value),
  );
  let isLocked = useEntity(props.value, "block/is-locked")?.data.value;
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

  if (!image) {
    if (!entity_set.permissions.write) return null;
    return (
      <div className="grow w-full">
        <label
          className={`
            group/image-block
            w-full h-[104px] hover:cursor-pointer p-2
            text-tertiary hover:text-accent-contrast hover:font-bold
            flex flex-col items-center justify-center
            hover:border-2 border-dashed  hover:border-accent-contrast rounded-lg
            ${isSelected && !isLocked ? "border-2 border-tertiary font-bold" : "border border-border"}
            ${props.pageType === "canvas" && "bg-bg-page"}`}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="flex gap-2">
            <BlockImageSmall
              className={`shrink-0 group-hover/image-block:text-accent-contrast ${isSelected ? "text-tertiary" : "text-border"}`}
            />
            Upload An Image
          </div>
          <input
            disabled={isLocked}
            className="h-0 w-0 hidden"
            type="file"
            accept="image/*"
            onChange={async (e) => {
              let file = e.currentTarget.files?.[0];
              if (!file || !rep) return;
              let entity = props.entityID;
              if (!entity) {
                entity = v7();
                await rep?.mutate.addBlock({
                  parent: props.parent,
                  factID: v7(),
                  permission_set: entity_set.set,
                  type: "text",
                  position: generateKeyBetween(
                    props.position,
                    props.nextPosition,
                  ),
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
            }}
          />
        </label>
      </div>
    );
  }

  let className = isFullBleed
    ? ""
    : isSelected
      ? "block-border-selected !border-transparent "
      : "block-border !border-transparent";

  let isLocalUpload = localImages.get(image.data.src);

  return (
    <div
      className={`relative group/image
        ${className}
        ${isFullBleed && "-mx-3 sm:-mx-4"}
        ${isFullBleed ? (isFirst ? "-mt-3 sm:-mt-4" : prevIsFullBleed ? "-mt-1" : "") : ""}
        ${isFullBleed ? (isLast ? "-mb-4" : nextIsFullBleed ? "-mb-2" : "") : ""} `}
    >
      {isFullBleed && isSelected ? <FullBleedSelectionIndicator /> : null}
      {isLocalUpload || image.data.local ? (
        <img
          loading="lazy"
          decoding="async"
          alt={""}
          src={isLocalUpload ? image.data.src + "?local" : image.data.fallback}
          height={image?.data.height}
          width={image?.data.width}
        />
      ) : (
        <Image
          alt={altText && altText !== "" ? altText : ""}
          src={new URL(image.data.src).pathname.split("/").slice(5).join("/")}
          height={image?.data.height}
          width={image?.data.width}
          className={className}
        />
      )}
      {altText !== undefined ? <ImageAlt entityID={props.value} /> : null}
    </div>
  );
}

export const FullBleedSelectionIndicator = () => {
  return (
    <div
      className={`absolute top-3 sm:top-4 bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 border-2 border-bg-page rounded-lg outline-offset-1 outline outline-2 outline-tertiary`}
    />
  );
};

export const ImageBlockContext = createContext({
  altEditorOpen: false,
  setAltEditorOpen: (s: boolean) => {},
});

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
        onOpenChange={(o) => setAltEditorOpen(o ? props.entityID : null)}
        className="text-sm max-w-xs  min-w-0"
        side="left"
        trigger={<ImageAltSmall fillColor={theme.colors["bg-page"]} />}
      >
        {entity_set.permissions.write ? (
          <AsyncValueAutosizeTextarea
            className="text-sm text-secondary outline-none bg-transparent min-w-0"
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
          <div className="text-sm text-secondary w-max"> {altText}</div>
        )}
      </Popover>
    </div>
  );
};
