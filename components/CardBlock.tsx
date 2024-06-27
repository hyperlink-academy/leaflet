import { BlockProps } from "components/Blocks";
import { focusCard } from "components/Cards";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { RenderedTextBlock } from "./TextBlock";

export function CardBlock(props: BlockProps) {
  let isSelected = useUIState(
    (s) =>
      (props.type !== "text" || s.selectedBlock.length > 1) &&
      s.selectedBlock.find((b) => b.value === props.entityID),
  );
  let blocks = useEntity(props.entityID, "card/block");
  let firstBlock = blocks.sort((a, b) => {
    return a.data.position > b.data.position ? 1 : -1;
  })[0];

  let isOpen = useUIState((s) => s.openCards).includes(props.entityID);

  let { rep } = useReplicache();

  return (
    <div
      className={`
        cardBlockWrapper relative group
        w-full h-[104px]
        bg-bg-card border shadow-sm outline outline-1 hover:outline-border-light rounded-lg
        flex overflow-hidden
        cursor-pointer
        ${isSelected || isOpen ? "outline-border border-border" : "outline-transparent border-border-light"}
        `}
      onClick={(e) => {
        e.stopPropagation();
        useUIState.getState().openCard(props.parent, props.entityID);
        if (rep) focusCard(props.entityID, rep, "focusFirstBlock");
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
      <CardPreview entityID={props.entityID} />
    </div>
  );
}

function CardPreview(props: { entityID: string }) {
  let blocks = useEntity(props.entityID, "card/block");
  return (
    <div
      className={`cardBlockPreview w-[120px] p-1 m-2 -mb-2 bg-bg-card border border-border-light flex flex-col gap-1 rotate-6 origin-center`}
    >
      {blocks
        .sort((a, b) => (a.data.position > b.data.position ? 1 : -1))
        .map((b) => (
          <PreviewBlock entityID={b.data.value} key={b.data.value} />
        ))}
    </div>
  );
}

function PreviewBlock(props: { entityID: string }) {
  let type = useEntity(props.entityID, "block/type");
  switch (type?.data.value) {
    case "text": {
      return (
        <div style={{ fontSize: "3px" }}>
          <RenderedTextBlock entityID={props.entityID} />
        </div>
      );
    }
    case "heading":
      return <HeadingPreviewBlock entityID={props.entityID} />;
    case "card":
      return <div className="w-full h-4 rounded-md bg-border-light" />;
    default:
      null;
  }
}

function HeadingPreviewBlock(props: { entityID: string }) {
  let headingLevel = useEntity(props.entityID, "block/heading-level");
  return (
    <div className={HeadingStyle[headingLevel?.data.value || 1]}>
      <RenderedTextBlock entityID={props.entityID} />
    </div>
  );
}

const HeadingStyle = {
  1: "text-[6px] font-bold",
  2: "text-[4px] font-bold ",
  3: "text-[3px] font-bold italic text-secondary ",
} as { [level: number]: string };
