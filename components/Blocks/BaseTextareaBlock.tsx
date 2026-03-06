import {
  AsyncValueAutosizeTextarea,
  AutosizeTextareaProps,
} from "components/utils/AutosizeTextarea";
import { BlockProps } from "./Block";
import { getCoordinatesInTextarea } from "src/utils/getCoordinatesInTextarea";
import { focusBlock } from "src/utils/focusBlock";
import { generateKeyBetween } from "fractional-indexing";
import { v7 } from "uuid";
import { elementId } from "src/utils/elementId";
import { Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";

type BaseTextareaBlockProps = AutosizeTextareaProps & {
  block: Pick<
    BlockProps,
    "previousBlock" | "nextBlock" | "parent" | "position" | "nextPosition"
  >;
  rep?: Replicache<ReplicacheMutators> | null;
  permissionSet?: string;
};

export function BaseTextareaBlock(props: BaseTextareaBlockProps) {
  let { block, rep, permissionSet, ...passDownProps } = props;
  return (
    <AsyncValueAutosizeTextarea
      {...passDownProps}
      noWrap
      onKeyDown={(e) => {
        // Shift-Enter or Ctrl-Enter: create new text block below and focus it
        if (
          (e.shiftKey || e.ctrlKey || e.metaKey) &&
          e.key === "Enter" &&
          rep &&
          permissionSet
        ) {
          e.preventDefault();
          let newEntityID = v7();
          rep.mutate.addBlock({
            parent: block.parent,
            type: "text",
            factID: v7(),
            permission_set: permissionSet,
            position: generateKeyBetween(
              block.position,
              block.nextPosition || null,
            ),
            newEntityID,
          });

          setTimeout(() => {
            document.getElementById(elementId.block(newEntityID).text)?.focus();
          }, 10);
          return true;
        }

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
