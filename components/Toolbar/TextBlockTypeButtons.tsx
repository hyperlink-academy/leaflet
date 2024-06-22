import {
  Header1Small,
  Header2Small,
  Header3Small,
  ParagraphSmall,
} from "components/Icons";
import { Separator } from "components/Layout";
import { CloseToolbarButton, ToolbarButton } from "components/Toolbar";
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
          className="w-10 flex justify-center"
          active
          onClick={() => props.onClose()}
        >
          {blockType?.data.value === "text" ? (
            <ParagraphSmall />
          ) : blockType?.data.value === "heading" ? (
            headingLevel?.data.value === 1 ? (
              <Header1Small />
            ) : headingLevel?.data.value === 2 ? (
              <Header2Small />
            ) : headingLevel?.data.value === 3 ? (
              <Header3Small />
            ) : null
          ) : null}{" "}
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
            if (blockType.data.value !== "text")
              rep?.mutate.assertFact({
                entity: focusedBlock?.entityID,
                attribute: "block/type",
                data: { type: "block-type-union", value: "text" },
              });
            props.onClose();
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
