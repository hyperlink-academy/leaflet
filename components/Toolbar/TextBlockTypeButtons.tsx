import {
  Header1Small,
  Header2Small,
  Header3Small,
  ParagraphSmall,
} from "components/Icons";
import { Separator } from "components/Layout";
import { setEditorState, useEditorStates } from "components/TextBlock";
import { CloseToolbarButton, ToolbarButton } from "components/Toolbar";
import { TextSelection } from "prosemirror-state";
import { useCallback } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
export const TextBlockTypeButtons = (props: { onClose: () => void }) => {
  let focusedBlock = useUIState((s) => s.focusedBlock);
  let blockType = useEntity(focusedBlock?.entityID || null, "block/type");
  let headingLevel = useEntity(
    focusedBlock?.entityID || null,
    "block/heading-level",
  );
  let { rep } = useReplicache();

  let setLevel = useCallback(
    (level: number) => {
      if (!focusedBlock) return;
      if (
        blockType?.data.value !== "text" &&
        blockType?.data.value !== "heading"
      ) {
        return;
      }
      if (blockType.data.value === "text") {
        keepFocus(focusedBlock.entityID);
        rep?.mutate.assertFact({
          entity: focusedBlock.entityID,
          attribute: "block/type",
          data: { type: "block-type-union", value: "heading" },
        });
      }
      rep?.mutate.assertFact({
        entity: focusedBlock.entityID,
        attribute: "block/heading-level",
        data: { type: "number", value: level },
      });
    },
    [rep, focusedBlock, blockType],
  );
  return (
    // This Toolbar should close once the user starts typing again
    <div className="flex w-full justify-between items-center gap-4">
      <div className="flex items-center gap-[6px]">
        <ToolbarButton className="w-10 flex justify-center" active>
          <BlockTypeIcon entityID={focusedBlock?.entityID} />
        </ToolbarButton>
        <Separator />
        <ToolbarButton
          onClick={() => {
            setLevel(1);
          }}
          active={
            blockType?.data.value === "heading" &&
            headingLevel?.data.value === 1
          }
        >
          <Header1Small />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            setLevel(2);
          }}
          active={
            blockType?.data.value === "heading" &&
            headingLevel?.data.value === 2
          }
        >
          <Header2Small />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            setLevel(3);
          }}
          active={
            blockType?.data.value === "heading" &&
            headingLevel?.data.value === 3
          }
        >
          <Header3Small />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            if (headingLevel)
              rep?.mutate.retractFact({ factID: headingLevel.id });
            if (!focusedBlock || !blockType) return;
            if (blockType.data.value !== "text") {
              keepFocus(focusedBlock.entityID);
              rep?.mutate.assertFact({
                entity: focusedBlock?.entityID,
                attribute: "block/type",
                data: { type: "block-type-union", value: "text" },
              });
            }
          }}
          active={blockType?.data.value === "text"}
          className="px-[6px]"
        >
          Paragraph
        </ToolbarButton>
      </div>
      <CloseToolbarButton onClose={props.onClose} />
    </div>
  );
};

function keepFocus(entityID: string) {
  let existingEditor = useEditorStates.getState().editorStates[entityID];
  let selection = existingEditor?.editor.selection;
  setTimeout(() => {
    let existingEditor = useEditorStates.getState().editorStates[entityID];
    if (!selection || !existingEditor) return;
    existingEditor.view?.focus();
    setEditorState(entityID, {
      editor: existingEditor.editor.apply(
        existingEditor.editor.tr.setSelection(
          TextSelection.create(existingEditor.editor.doc, selection.anchor),
        ),
      ),
    });
  }, 10);
}

export function TextBlockTypeButton(props: {
  setToolbarState: (s: "header") => void;
}) {
  let focusedBlock = useUIState((s) => s.focusedBlock);
  return (
    <ToolbarButton
      active
      onClick={() => {
        props.setToolbarState("header");
      }}
    >
      <BlockTypeIcon entityID={focusedBlock?.entityID} />
    </ToolbarButton>
  );
}

function BlockTypeIcon(props: { entityID?: string }) {
  let blockType = useEntity(props.entityID || null, "block/type");
  let headingLevel =
    useEntity(props.entityID || null, "block/heading-level")?.data.value || 1;
  if (blockType?.data.value === "text") return <ParagraphSmall />;
  if (blockType?.data.value === "heading") {
    if (headingLevel === 1) return <Header1Small />;
    if (headingLevel === 2) return <Header2Small />;
    if (headingLevel === 3) return <Header3Small />;
  }
  return null;
}
