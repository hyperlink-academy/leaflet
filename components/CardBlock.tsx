import { BlockProps } from "components/Blocks";
import { focusCard } from "components/Cards";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { RenderedTextBlock } from "./TextBlock";

export function CardBlock(props: BlockProps) {
  let selected = useUIState(
    (s) =>
      (props.type !== "text" || s.selectedBlock.length > 1) &&
      s.selectedBlock.includes(props.entityID),
  );
  let blocks = useEntity(props.entityID, "card/block");
  let firstBlock = blocks.sort((a, b) => {
    return a.data.position > b.data.position ? 1 : -1;
  })[0];

  let focusedElement = useUIState((s) => s.focusedBlock);
  let focusedCardID =
    focusedElement?.type === "card"
      ? focusedElement.entityID
      : focusedElement?.parent;

  let { rep } = useReplicache();

  return (
    <div
      className={`cardBlockWrapper relative group w-full h-[104px] border border-border outline outline-1 outline-transparent hover:outline-border rounded-lg flex overflow-hidden ${!selected ? "outline-1" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        useUIState.getState().openCard(props.parent, props.entityID);
        if (rep)
          focusCard(props.entityID, focusedCardID, rep, "focusFirstBlock");
      }}
    >
      <div className={`p-2 grow`}>
        {/* TODO:
        if the document is completely empty (no blocks, no text) show placeholder text
        the placeholder should be classname= "text-tertiary italic font-bold"  */}

        {/* TODO:
        header blocks should (regardless of what kind of header) render as "text-primary font-bold"*/}

        {/* TODO:
        this block can fit a total of 4 lines of text.
        the first block should take up to 4 lines of space.
        If it doesn't need all 4 lines, the next text block
        should be rendered and so on until all 4 lines are filled */}

        {/* TODO:
        the cardBlockPreview image should be screenshot of the page it links to */}

        <RenderedTextBlock entityID={firstBlock?.data.value} />
      </div>
      <div
        className={`cardBlockPreview w-[120px] m-2 -mb-2 bg-test shrink-0 rounded-t-md border border-border-light `}
      />
    </div>
  );
}
