"use client";

import { useEntity, useReplicache } from "src/replicache";
import { Block, BlockProps } from "./Block";
import { useUIState } from "src/useUIState";
import { BlockImageSmall } from "components/Icons";
import { v7 } from "uuid";
import { useEntitySetContext } from "components/EntitySetProvider";
import { generateKeyBetween } from "fractional-indexing";
import { addImage } from "src/utils/addImage";
import { elementId } from "src/utils/elementId";
import { useEffect } from "react";
import { deleteBlock } from "./DeleteBlock";

export function ImageBlock(props: BlockProps & { preview?: boolean }) {
  let { rep } = useReplicache();
  let image = useEntity(props.value, "block/image");
  let entity_set = useEntitySetContext();
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.value),
  );
  let isLocked = useEntity(props.value, "block/is-locked")?.data.value;

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
            w-full h-[104px] p-2 hover:cursor-pointer
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

  return (
    <div className="relative group/image flex w-full justify-center">
      <img
        loading="lazy"
        decoding="async"
        alt={""}
        src={
          image?.data.local && image.data.local !== rep?.clientID
            ? image?.data.fallback
            : image?.data.src
        }
        height={image?.data.height}
        width={image?.data.width}
        className={
          isSelected
            ? "block-border-selected !border-transparent "
            : "block-border !border-transparent"
        }
      />
    </div>
  );
}
