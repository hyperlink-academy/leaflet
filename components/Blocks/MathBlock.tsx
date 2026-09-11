import { useEntity, useReplicache } from "src/replicache";
import { BlockLayout, BlockProps } from "./Block";
import { useUIState } from "src/useUIState";
import { theme } from "tailwind.config";
import { BaseTextareaBlock } from "./BaseTextareaBlock";
import { useMathHtml } from "./useMathHtml";
import { elementId } from "src/utils/elementId";
import { useEntitySetContext } from "components/EntitySetProvider";

export function MathBlock(props: BlockProps) {
  let content = useEntity(props.entityID, "block/math");
  let focusedBlock = useUIState(
    (s) => s.focusedEntity?.entityID === props.entityID,
  );
  let { rep } = useReplicache();
  let entity_set = useEntitySetContext();
  let html = useMathHtml(content?.data.value, theme.colors["accent-contrast"]);
  return focusedBlock ? (
    <BlockLayout
      isSelected={focusedBlock}
      hasBackground="accent"
      className="min-h-[48px]"
    >
      <BaseTextareaBlock
        id={elementId.block(props.entityID).input}
        block={props}
        rep={rep}
        permissionSet={entity_set.set}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        className="h-full w-full  whitespace-nowrap overflow-auto!"
        placeholder="write some Tex here…"
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
  ) : content?.data.value ? (
    <div className="text-lg min-h-[48px] w-full border border-transparent">
      {html ? (
        <span dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <span className="whitespace-pre-wrap">{content.data.value}</span>
      )}
    </div>
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
