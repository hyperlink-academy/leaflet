"use client";

import { useEntity, useReplicache } from "src/replicache";
import { BlockProps, focusBlock, useUIState } from "./Blocks";
import { useEffect } from "react";
import { addImage } from "src/utils/addImage";
import { generateKeyBetween } from "fractional-indexing";
import { useEditorStates } from "./TextBlock";
import { elementId } from "src/utils/elementId";

export function ImageBlock(props: BlockProps) {
  let rep = useReplicache();
  let image = useEntity(props.entityID, "block/image");
  let selected = useUIState((s) => s.selectedBlock.includes(props.entityID));
  useEffect(() => {
    if (!selected || !rep.rep) return;
    let r = rep.rep;
    let listener = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        let block = props.nextBlock;
        if (block)
          focusBlock(block, useEditorStates.getState().lastXPosition, "top");
        if (!block) return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        let block = props.previousBlock;
        if (block)
          focusBlock(block, useEditorStates.getState().lastXPosition, "bottom");
        if (!block) return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        r.mutate.removeBlock({ blockEntity: props.entityID });
        let block = props.previousBlock;
        if (block) focusBlock(block, "end", "bottom");
      }
      if (e.key === "Enter") {
        let newEntityID = crypto.randomUUID();
        r.mutate.addBlock({
          newEntityID,
          parent: props.parent,
          type: "text",
          position: generateKeyBetween(props.position, props.nextPosition),
        });
        setTimeout(() => {
          document.getElementById(elementId.block(newEntityID).text)?.focus();
        }, 10);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [
    selected,
    props.entityID,
    props.nextBlock,
    props.previousBlock,
    props.position,
    props.nextPosition,
    rep,
    props.parent,
  ]);
  console.log(image);
  if (image?.data.local && image.data.local !== rep.rep?.clientID)
    return (
      <div
        style={{
          height: image?.data.height,
          width: image?.data.width,
        }}
        className="flex content-center text-center"
      >
        loading
      </div>
    );

  return (
    <img
      onClick={() => useUIState.getState().setSelectedBlock(props.entityID)}
      alt={""}
      src={image?.data.src}
      height={image?.data.height}
      width={image?.data.width}
    />
  );
}
