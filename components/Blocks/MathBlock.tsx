import { useEntity, useReplicache } from "src/replicache";
import "katex/dist/katex.min.css";
import { BlockLayout, BlockProps } from "./Block";
import Katex from "katex";
import { useMemo } from "react";
import { useUIState } from "src/useUIState";
import { theme } from "tailwind.config";
import { BaseTextareaBlock } from "./BaseTextareaBlock";
import { elementId } from "src/utils/elementId";

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
      });

      return { html, error: undefined };
    } catch (error) {
      if (error instanceof Katex.ParseError || error instanceof TypeError) {
        return { error };
      }

      throw error;
    }
  }, [content?.data.value]);
  return focusedBlock ? (
    <BlockLayout
      isSelected={focusedBlock}
      hasBackground="accent"
      className="min-h-[48px]"
    >
      <BaseTextareaBlock
        id={elementId.block(props.entityID).input}
        block={props}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        className="h-full w-full  whitespace-nowrap overflow-auto!"
        placeholder="write some Tex here..."
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
    </BlockLayout>
  ) : html && content?.data.value ? (
    <div
      className="text-lg min-h-[48px] w-full border border-transparent"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  ) : (
    <BlockLayout
      isSelected={focusedBlock}
      hasBackground="accent"
      className="min-h-[48px]"
    >
      <div className="text-tertiary italic w-full ">write some Tex here...</div>
    </BlockLayout>
  );
}
