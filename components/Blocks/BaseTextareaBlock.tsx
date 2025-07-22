import {
  AsyncValueAutosizeTextarea,
  AutosizeTextareaProps,
} from "components/utils/AutosizeTextarea";
import { BlockProps } from "./Block";
import { getCoordinatesInTextarea } from "src/utils/getCoordinatesInTextarea";
import { focusBlock } from "src/utils/focusBlock";

export function BaseTextareaBlock(
  props: AutosizeTextareaProps & {
    block: Pick<BlockProps, "previousBlock" | "nextBlock">;
  },
) {
  let { block, ...passDownProps } = props;
  return (
    <AsyncValueAutosizeTextarea
      {...passDownProps}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") {
          let selection = e.currentTarget.selectionStart;

          let lastLineBeforeCursor = e.currentTarget.value
            .slice(0, selection)
            .lastIndexOf("\n");
          if (lastLineBeforeCursor !== -1) return;
          let block = props.block.previousBlock;
          let coord = getCoordinatesInTextarea(e.currentTarget, selection);
          if (block) {
            focusBlock(block, {
              left: coord.left + e.currentTarget.getBoundingClientRect().left,
              type: "bottom",
            });
            return true;
          }
        }
        if (e.key === "ArrowDown") {
          let selection = e.currentTarget.selectionStart;

          let lastLine = e.currentTarget.value.lastIndexOf("\n");
          let lastLineBeforeCursor = e.currentTarget.value
            .slice(0, selection)
            .lastIndexOf("\n");
          if (lastLine !== lastLineBeforeCursor) return;
          e.preventDefault();
          let block = props.block.nextBlock;

          let coord = getCoordinatesInTextarea(e.currentTarget, selection);
          console.log(coord);
          if (block) {
            focusBlock(block, {
              left: coord.left + e.currentTarget.getBoundingClientRect().left,
              type: "top",
            });
            return true;
          }
        }
      }}
    />
  );
}
