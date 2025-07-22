import { BundledLanguage, bundledLanguagesInfo, codeToHtml } from "shiki";
import { useEntity, useReplicache } from "src/replicache";
import "katex/dist/katex.min.css";
import { BlockProps } from "./Block";
import { useLayoutEffect, useMemo, useState } from "react";
import { useUIState } from "src/useUIState";
import { BaseTextareaBlock } from "./BaseTextareaBlock";
import { useEntitySetContext } from "components/EntitySetProvider";

export function CodeBlock(props: BlockProps) {
  let content = useEntity(props.entityID, "block/code");
  let lang =
    useEntity(props.entityID, "block/code-language")?.data.value ||
    "typescript";
  let focusedBlock = useUIState(
    (s) => s.focusedEntity?.entityID === props.entityID,
  );
  let { permissions } = useEntitySetContext();
  let { rep } = useReplicache();
  const [html, setHTML] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!content) return;
    void codeToHtml(content.data.value, {
      lang: lang,
      theme: "solarized-light",
    }).then((h) => {
      setHTML(h);
    });
  }, [content, lang]);
  return (
    <div className="codeBlock w-full flex flex-col rounded-md gap-0.5 ">
      {permissions.write && (
        <div className="text-sm text-tertiary flex justify-between">
          <div className="codeBlockTheme">Theme: Solarized</div>
          <select
            className="codeBlockLang text-right bg-transparent pr-1"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            value={lang}
            onChange={async (e) => {
              await rep?.mutate.assertFact({
                attribute: "block/code-language",
                entity: props.entityID,
                data: { type: "string", value: e.target.value },
              });
            }}
          >
            {bundledLanguagesInfo.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="w-full rounded-md border-border-light outline-border-light selected-outline">
        {focusedBlock && permissions.write ? (
          <BaseTextareaBlock
            block={props}
            className="codeBlockEditor p-2 pt-[9px] whitespace-nowrap !overflow-auto font-mono "
            value={content?.data.value}
            onChange={async (e) => {
              // Update the entity with the new value
              await rep?.mutate.assertFact({
                attribute: "block/code",
                entity: props.entityID,
                data: { type: "string", value: e.target.value },
              });
            }}
          />
        ) : !html && content?.data.value ? (
          <pre className="codeBlockRendered  rounded-md w-full !overflow-auto">
            {content?.data.value}
          </pre>
        ) : (
          <pre
            data-lang={lang}
            className="codeBlockEmpty rounded-md w-full  !overflow-auto"
            dangerouslySetInnerHTML={{ __html: html || "" }}
          ></pre>
        )}
      </div>
    </div>
  );
}
