import { useEntity, useReplicache } from "src/replicache";
import "katex/dist/katex.min.css";
import { BlockProps } from "./Block";
import { AsyncValueAutosizeTextarea } from "components/utils/AutosizeTextarea";
import Katex from "katex";
import { useMemo } from "react";
import { useUIState } from "src/useUIState";
import { focusBlock } from "src/utils/focusBlock";
import { getCoordinatesInTextarea } from "src/utils/getCoordinatesInTextarea";
import { theme } from "tailwind.config";
export function MathBlock(props: BlockProps) {
  let content = useEntity(props.entityID, "block/math");
  let focusedBlock = useUIState(
    (s) => s.focusedEntity?.entityID === props.entityID,
  );
  let { rep } = useReplicache();
  const { html, error } = useMemo(() => {
    try {
      const html = Katex.renderToString(content?.data.value || "", {
        displayMode: true,
        throwOnError: false,
        errorColor: theme.colors["accent-contrast"],
        macros: {
          "\\f": "#1f(#2)",
        },
      });

      return { html, error: undefined };
    } catch (error) {
      if (error instanceof Katex.ParseError || error instanceof TypeError) {
        return { error };
      }

      throw error;
    }
  }, [content?.data.value]);
  return (
    <div className="w-full">
      {focusedBlock ? (
        <AsyncValueAutosizeTextarea
          autoFocus
          className="bg-border-light rounded-md p-2 w-full min-h-[48px] whitespace-nowrap !overflow-auto"
          placeholder="write some LaTex here..."
          value={content?.data.value}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              let selection = e.currentTarget.selectionStart;

              let lastLineBeforeCursor = e.currentTarget.value
                .slice(0, selection)
                .lastIndexOf("\n");
              if (lastLineBeforeCursor !== -1) return;
              let block = props.previousBlock;
              let coord = getCoordinatesInTextarea(e.currentTarget, selection);
              if (block) {
                focusBlock(block, {
                  left:
                    coord.left + e.currentTarget.getBoundingClientRect().left,
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
              let block = props.nextBlock;

              let coord = getCoordinatesInTextarea(e.currentTarget, selection);
              console.log(coord);
              if (block) {
                focusBlock(block, {
                  left:
                    coord.left + e.currentTarget.getBoundingClientRect().left,
                  type: "top",
                });
                return true;
              }
            }
          }}
          onChange={async (e) => {
            // Update the entity with the new value
            await rep?.mutate.assertFact({
              attribute: "block/math",
              entity: props.entityID,
              data: { type: "string", value: e.target.value },
            });
          }}
        />
      ) : html && content?.data.value ? (
        <div
          className="text-lg min-h-[46px]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className="text-tertiary italic rounded-md p-2 w-full min-h-16">
          write some LaTex here...
        </div>
      )}
    </div>
  );
}
