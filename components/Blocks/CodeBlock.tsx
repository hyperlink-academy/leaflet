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
    useEntity(props.entityID, "block/code-language")?.data.value || "ts";
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
    <div className="w-full relative">
      {permissions.write && (
        <select
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute top-0 right-0 z-10"
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
      )}
      {focusedBlock && permissions.write ? (
        <div className="w-full -m-2">
          <BaseTextareaBlock
            block={props}
            className="border border-border rounded-md p-2 w-full whitespace-nowrap !overflow-auto"
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
        </div>
      ) : !html && content?.data.value ? (
        <pre className="-m-2 border border-border rounded-md p-2 w-full !overflow-auto">
          {content?.data.value}
        </pre>
      ) : (
        <pre
          data-lang={lang}
          className="-m-2 border border-border rounded-md p-2 w-full !overflow-auto"
          dangerouslySetInnerHTML={{ __html: html || "" }}
        ></pre>
      )}
    </div>
  );
}
