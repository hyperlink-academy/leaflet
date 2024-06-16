import { BlockProps } from "components/Blocks";
import { focusCard } from "components/Cards";
import { useEntity } from "src/replicache";
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
  return (
    <div
      className={`border w-full rounded-[4px]`}
      onClick={() => {
        useUIState.getState().openCard(props.parent, props.entityID);
        focusCard(props.entityID);
      }}
    >
      <div
        className={`p-2 rounded-[3px] border ${!selected ? "border-transparent" : ""}`}
      >
        <RenderedTextBlock entityID={firstBlock?.data.value} />
      </div>
    </div>
  );
}
