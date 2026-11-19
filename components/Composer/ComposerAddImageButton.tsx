"use client";
import { useRef } from "react";
import { BlockImageSmall } from "components/Icons/BlockImageSmall";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useReplicache } from "src/replicache";
import { getPageBlocks } from "src/replicache/getBlocks";
import { useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";
import { addBlockBelow } from "src/utils/addBlockBelow";
import { addImage } from "src/utils/addImage";
import { focusBlock } from "src/utils/focusBlock";

export function ComposerAddImageButton(props: { disabled: boolean }) {
  let { rep, undoManager } = useReplicache();
  let { set } = useEntitySetContext();

  let targetRef = useRef<{ entityID: string; parent: string } | null>(null);

  let insert = async (file: File) => {
    let focused = targetRef.current;
    if (!rep || !focused) return;
    let blocks = getPageBlocks(rep, focused.parent);
    let index = blocks.findIndex((b) => b.entityID === focused.entityID);
    let target = blocks[index];
    if (!target) return;
    let isEmptyLine =
      (target.type === "text" || target.type === "heading") &&
      !useEditorStates.getState().editorStates[target.entityID]?.editor.doc
        .textContent;

    await undoManager.withUndoGroup(async () => {
      let entity: string;
      if (isEmptyLine) {
        entity = target.entityID;
        await rep.mutate.assertFact({
          entity,
          attribute: "block/type",
          data: { type: "block-type-union", value: "image" },
        });
      } else {
        entity = await addBlockBelow(rep, {
          parent: target.parent,
          position: target.position,
          nextPosition: blocks[index + 1]?.position ?? null,
          permission_set: set,
          type: "image",
        });
      }
      focusBlock(
        { type: "image", entityID: entity, parent: target.parent },
        { type: "start" },
      );
      await addImage(file, rep, { entityID: entity, attribute: "block/image" });
    });
  };

  return (
    <label
      aria-label="Add an image"
      aria-disabled={props.disabled}
      className={`composerMarkButton rounded-md  text-border ${props.disabled ? "opacity-50 pointer-events-none" : "hover:bg-border-light hover:cursor-pointer hover:text-secordary"}`}
      onMouseDown={(e) => {
        e.preventDefault();
        let focused = useUIState.getState().focusedEntity;
        targetRef.current =
          focused?.entityType === "block"
            ? { entityID: focused.entityID, parent: focused.parent }
            : null;
      }}
    >
      <BlockImageSmall />
      <input
        className="hidden"
        type="file"
        accept="image/*"
        disabled={props.disabled}
        onChange={async (e) => {
          let file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file?.type.startsWith("image/")) await insert(file);
        }}
      />
    </label>
  );
}
