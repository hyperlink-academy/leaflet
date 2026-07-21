import { useUIState } from "src/useUIState";
import { BlockLayout, BlockProps } from "./Block";

export const HorizontalRule = (props: BlockProps) => {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.value),
  );
  return (
    <BlockLayout
      isSelected={!!isSelected}
      className="border-transparent! outline-transparent! p-0! overflow-visible!"
    >
      <hr
        className={`my-2 w-full border-border-light
    ${isSelected ? "block-border-selected outline-offset-[3px]!" : ""}
  `}
      />
    </BlockLayout>
  );
};
