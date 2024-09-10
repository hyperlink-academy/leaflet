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

export function ImageBlock(props: BlockProps) {
  let { rep } = useReplicache();
  let image = useEntity(props.value, "block/image");
  let entity_set = useEntitySetContext();
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.value),
  );
  if (!image)
    return (
      <div>
        <label
          id={elementId.block(props.entityID).input}
          className="w-full border focus-within:bg-test flex flex-row"
          onMouseDown={(e) => e.preventDefault()}
        >
          add an image <BlockImageSmall />
          <input
            className="h-0 w-0"
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

  return (
    <div className="relative group/image flex w-full justify-center">
      <img
        alt={""}
        src={
          image?.data.local && image.data.local !== rep?.clientID
            ? image?.data.fallback
            : image?.data.src
        }
        height={image?.data.height}
        width={image?.data.width}
        className={`
          outline outline-1 border rounded-lg
          ${isSelected ? "border-tertiary outline-tertiary" : "border-transparent  outline-transparent"}`}
      />
    </div>
  );
}
