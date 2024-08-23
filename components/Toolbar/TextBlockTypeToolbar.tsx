import {
  Header1Small,
  Header2Small,
  Header3Small,
  ParagraphSmall,
} from "components/Icons";
import { ShortcutKey } from "components/Layout";
import { ToolbarButton } from "components/Toolbar";
import { TextSelection } from "prosemirror-state";
import { useCallback } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { setEditorState, useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";

export const TextBlockTypeToolbar = (props: {
  onClose: () => void;
  className?: string;
}) => {
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
        <ToolbarButton
          className={props.className}
          onClick={() => {
            setLevel(1);
            focusedBlock && keepFocus(focusedBlock.entityID);
          }}
          active={
            blockType?.data.value === "heading" &&
            headingLevel?.data.value === 1
          }
          tooltipContent={
            <div className="flex flex-col justify-center">
              <div className="font-bold text-center">Title</div>
              <div className="flex gap-1 font-normal">
                start line with
                <ShortcutKey>#</ShortcutKey>
              </div>
            </div>
          }
        >
          <Header1Small />
        </ToolbarButton>
        <ToolbarButton
          className={props.className}
          onClick={() => {
            setLevel(2);
            focusedBlock && keepFocus(focusedBlock.entityID);
          }}
          active={
            blockType?.data.value === "heading" &&
            headingLevel?.data.value === 2
          }
          tooltipContent={
            <div className="flex flex-col justify-center">
              <div className="font-bold text-center">Heading</div>
              <div className="flex gap-1 font-normal">
                start line with
                <ShortcutKey>##</ShortcutKey>
              </div>
            </div>
          }
        >
          <Header2Small />
        </ToolbarButton>
        <ToolbarButton
          className={props.className}
          onClick={() => {
            setLevel(3);
            focusedBlock && keepFocus(focusedBlock.entityID);
          }}
          active={
            blockType?.data.value === "heading" &&
            headingLevel?.data.value === 3
          }
          tooltipContent={
            <div className="flex flex-col justify-center">
              <div className="font-bold text-center">Subheading</div>
              <div className="flex gap-1 font-normal">
                start line with
                <ShortcutKey>###</ShortcutKey>
              </div>
            </div>
          }
        >
          <Header3Small />
        </ToolbarButton>
        <ToolbarButton
          className={`px-[6px] ${props.className}`}
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
          tooltipContent={<div>Paragraph</div>}
        >
          Paragraph
        </ToolbarButton>
      </div>
    </div>
  );
};

export function keepFocus(entityID: string) {
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
  }, 20);
}

export function TextBlockTypeButton(props: {
  setToolbarState: (s: "header") => void;
  className?: string;
}) {
  let focusedBlock = useUIState((s) => s.focusedBlock);
  return (
    <ToolbarButton
      tooltipContent={<div>Format Text</div>}
      className={`${props.className} w-8`}
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
  if (blockType?.data.value === "text")
    return <ParagraphSmall className="mx-auto" />;
  if (blockType?.data.value === "heading") {
    if (headingLevel === 1) return <Header1Small />;
    if (headingLevel === 2) return <Header2Small />;
    if (headingLevel === 3) return <Header3Small />;
  }
  // sometimes, toolbar or block options is visible but there is no focused block,
  // for example, a few milliseconds after a block is deleted. We default to paragraph
  return <ParagraphSmall className="mx-auto" />;
}
