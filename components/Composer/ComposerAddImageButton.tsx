"use client";
import { useRef } from "react";
import { generateKeyBetween } from "fractional-indexing";
import { v7 } from "uuid";
import { BlockImageSmall } from "components/Icons/BlockImageSmall";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useReplicache } from "src/replicache";
import { getPageBlocks } from "src/replicache/getBlocks";
import { useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";
import { prepareImage } from "src/utils/addImage";
import { focusBlock } from "src/utils/focusBlock";

export function ComposerAddImageButton(props: {
  root: string;
  disabled: boolean;
}) {
  let { rep, undoManager } = useReplicache();
  let { set } = useEntitySetContext();

  let focusedRef = useRef<string | null>(null);

  let insert = async (file: File) => {
    if (!rep) return;
    let blocks = getPageBlocks(rep, props.root);
    let index = blocks.findIndex((b) => b.entityID === focusedRef.current);
    if (index === -1) index = blocks.length - 1;
    let target = blocks[index];
    if (!target) return;
    let isEmptyLine =
      (target.type === "text" || target.type === "heading") &&
      !useEditorStates.getState().editorStates[target.entityID]?.editor.doc
        .textContent;

    let entity = isEmptyLine ? target.entityID : v7();
    let { imageFact, finishUpload } = await prepareImage(file, rep, {
      entityID: entity,
      attribute: "block/image",
      ignoreUndo: true,
    });
    await undoManager.withUndoGroup(async () => {
      if (isEmptyLine)
        await rep.mutate.assertFact({
          entity,
          attribute: "block/type",
          data: { type: "block-type-union", value: "image" },
        });
      else
        await rep.mutate.addBlock({
          parent: target.parent,
          factID: v7(),
          permission_set: set,
          type: "image",
          position: generateKeyBetween(
            target.position,
            blocks[index + 1]?.position ?? null,
          ),
          newEntityID: entity,
        });
      await rep.mutate.assertFact({ ...imageFact, ignoreUndo: undefined });
    });
    focusBlock(
      { type: "image", entityID: entity, parent: target.parent },
      { type: "start" },
    );
    await finishUpload();
  };

  return (
    <label
      aria-label="Add an image"
      aria-disabled={props.disabled}
      className={`composerMarkButton rounded-md  text-border ${props.disabled ? "opacity-50 pointer-events-none" : "hover:bg-border-light hover:cursor-pointer hover:text-secondary"}`}
      onMouseDown={(e) => {
        e.preventDefault();
        let focused = useUIState.getState().focusedEntity;
        focusedRef.current =
          focused?.entityType === "block" && focused.parent === props.root
            ? focused.entityID
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
