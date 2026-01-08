import {
  Header1Small,
  Header2Small,
  Header3Small,
} from "components/Icons/BlockTextSmall";
import { Props } from "components/Icons/Props";
import { ShortcutKey, Separator } from "components/Layout";
import { ToolbarButton } from "components/Toolbar";
import { TextSelection } from "prosemirror-state";
import { useCallback } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";

export const TextBlockTypeToolbar = (props: {
  onClose: () => void;
  className?: string;
}) => {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let blockType = useEntity(focusedBlock?.entityID || null, "block/type");
  let headingLevel = useEntity(
    focusedBlock?.entityID || null,
    "block/heading-level",
  );

  let textSize = useEntity(focusedBlock?.entityID || null, "block/text-size");
  let { rep } = useReplicache();

  let setLevel = useCallback(
    async (level: number) => {
      if (!focusedBlock) return;
      let entityID = focusedBlock.entityID;
      if (
        blockType?.data.value !== "text" &&
        blockType?.data.value !== "heading"
      ) {
        return;
      }
      await rep?.mutate.assertFact({
        entity: entityID,
        attribute: "block/heading-level",
        data: { type: "number", value: level },
      });
      if (blockType.data.value === "text") {
        await rep?.mutate.assertFact({
          entity: entityID,
          attribute: "block/type",
          data: { type: "block-type-union", value: "heading" },
        });
      }
    },
    [rep, focusedBlock, blockType],
  );
  return (
    // This Toolbar should close once the user starts typing again
    <>
      <ToolbarButton
        className={props.className}
        onClick={() => {
          setLevel(1);
        }}
        active={
          blockType?.data.value === "heading" && headingLevel?.data.value === 1
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
        }}
        active={
          blockType?.data.value === "heading" && headingLevel?.data.value === 2
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
        }}
        active={
          blockType?.data.value === "heading" && headingLevel?.data.value === 3
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
      <Separator classname="h-6!" />
      <ToolbarButton
        className={`px-[6px] ${props.className}`}
        onClick={async () => {
          if (headingLevel)
            await rep?.mutate.retractFact({ factID: headingLevel.id });
          if (textSize) await rep?.mutate.retractFact({ factID: textSize.id });
          if (!focusedBlock || !blockType) return;
          if (blockType.data.value !== "text") {
            let existingEditor =
              useEditorStates.getState().editorStates[focusedBlock.entityID];
            let selection = existingEditor?.editor.selection;
            await rep?.mutate.assertFact({
              entity: focusedBlock?.entityID,
              attribute: "block/type",
              data: { type: "block-type-union", value: "text" },
            });

            let newEditor =
              useEditorStates.getState().editorStates[focusedBlock.entityID];
            if (!newEditor || !selection) return;
            newEditor.view?.dispatch(
              newEditor.editor.tr.setSelection(
                TextSelection.create(newEditor.editor.doc, selection.anchor),
              ),
            );

            newEditor.view?.focus();
          }
        }}
        active={
          blockType?.data.value === "text" &&
          textSize?.data.value !== "small" &&
          textSize?.data.value !== "large"
        }
        tooltipContent={<div>Normal Text</div>}
      >
        Text
      </ToolbarButton>
      <ToolbarButton
        className={`px-[6px] text-lg ${props.className}`}
        onClick={async () => {
          if (!focusedBlock || !blockType) return;
          if (blockType.data.value !== "text") {
            // Convert to text block first if it's a heading
            if (headingLevel)
              await rep?.mutate.retractFact({ factID: headingLevel.id });
            await rep?.mutate.assertFact({
              entity: focusedBlock.entityID,
              attribute: "block/type",
              data: { type: "block-type-union", value: "text" },
            });
          }
          // Set text size to large
          await rep?.mutate.assertFact({
            entity: focusedBlock.entityID,
            attribute: "block/text-size",
            data: { type: "text-size-union", value: "large" },
          });
        }}
        active={
          blockType?.data.value === "text" && textSize?.data.value === "large"
        }
        tooltipContent={<div>Large Text</div>}
      >
        <div className="leading-[1.625rem]">Large</div>
      </ToolbarButton>
      <ToolbarButton
        className={`px-[6px] text-sm text-secondary ${props.className}`}
        onClick={async () => {
          if (!focusedBlock || !blockType) return;
          if (blockType.data.value !== "text") {
            // Convert to text block first if it's a heading
            if (headingLevel)
              await rep?.mutate.retractFact({ factID: headingLevel.id });
            await rep?.mutate.assertFact({
              entity: focusedBlock.entityID,
              attribute: "block/type",
              data: { type: "block-type-union", value: "text" },
            });
          }
          // Set text size to small
          await rep?.mutate.assertFact({
            entity: focusedBlock.entityID,
            attribute: "block/text-size",
            data: { type: "text-size-union", value: "small" },
          });
        }}
        active={
          blockType?.data.value === "text" && textSize?.data.value === "small"
        }
        tooltipContent={<div>Small Text</div>}
      >
        <div className="leading-[1.625rem]">Small</div>
      </ToolbarButton>
    </>
  );
};

export function TextBlockTypeButton(props: {
  setToolbarState: (s: "heading") => void;
  className?: string;
}) {
  return (
    <ToolbarButton
      tooltipContent={<div>Text Size</div>}
      className={`${props.className}`}
      onClick={() => {
        props.setToolbarState("heading");
      }}
    >
      <TextSizeSmall />
    </ToolbarButton>
  );
}

const TextSizeSmall = (props: Props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.3435 12.6008C14.4028 12.7825 14.6587 12.7855 14.7222 12.6052L14.8715 12.1816H19.0382L19.8657 14.6444C19.9067 14.7666 20.0212 14.8489 20.15 14.8489H21.6021C21.809 14.8489 21.9538 14.6443 21.885 14.4491L18.2831 4.23212C18.2408 4.11212 18.1274 4.03186 18.0002 4.03186H16.0009C15.8761 4.03186 15.7643 4.10917 15.7203 4.22598L13.5539 9.96923C13.5298 10.0331 13.5282 10.1033 13.5494 10.1682L14.3435 12.6008ZM18.5093 10.6076L17.0588 6.29056C17.0507 6.26644 17.0281 6.25019 17.0027 6.25019C16.9775 6.25019 16.9552 6.26605 16.9468 6.28974L15.4259 10.6076H18.5093ZM4.57075 19.9682C4.69968 19.9682 4.81418 19.8858 4.85518 19.7636L5.98945 16.3815H11.4579L12.5943 19.7637C12.6353 19.8859 12.7498 19.9682 12.8787 19.9682H15.0516C15.2586 19.9682 15.4034 19.7636 15.3346 19.5684L10.4182 5.62298C10.3759 5.50299 10.2625 5.42273 10.1353 5.42273H7.30723C7.17995 5.42273 7.06652 5.50305 7.02425 5.62311L2.11475 19.5686C2.04604 19.7637 2.19084 19.9682 2.39772 19.9682H4.57075ZM10.7468 14.2651L8.79613 8.45953C8.78532 8.42736 8.75517 8.40568 8.72123 8.40568C8.68728 8.40568 8.65712 8.42738 8.64633 8.45957L6.69928 14.2651H10.7468Z"
        fill="currentColor"
      />
    </svg>
  );
};
