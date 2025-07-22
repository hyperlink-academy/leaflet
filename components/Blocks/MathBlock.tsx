import { useEntity, useReplicache } from "src/replicache";
import "katex/dist/katex.min.css";
import { BlockProps } from "./Block";
import Katex from "katex";
import { useMemo } from "react";
import { useUIState } from "src/useUIState";
import { theme } from "tailwind.config";
import { BaseTextareaBlock } from "./BaseTextareaBlock";

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
        <BaseTextareaBlock
          block={props}
          className="bg-border-light rounded-md p-2 w-full min-h-[48px] whitespace-nowrap !overflow-auto"
          placeholder="write some LaTex here..."
          value={content?.data.value}
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
