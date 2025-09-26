import { useUIState } from "src/useUIState";
import { BlockProps } from "./Block";

export const HorizontalRule = (props: BlockProps) => {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.value),
  );
  return (
    <hr
      className={`my-2 w-full border-border-light
    ${isSelected ? "block-border-selected outline-offset-[3px]!" : ""}
  `}
    />
  );
};
