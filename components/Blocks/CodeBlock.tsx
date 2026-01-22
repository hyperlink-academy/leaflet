import {
  BundledLanguage,
  bundledLanguagesInfo,
  bundledThemesInfo,
  codeToHtml,
} from "shiki";
import { useEntity, useReplicache } from "src/replicache";
import "katex/dist/katex.min.css";
import { BlockLayout, BlockProps } from "./Block";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { useUIState } from "src/useUIState";
import { BaseTextareaBlock } from "./BaseTextareaBlock";
import { useEntitySetContext } from "components/EntitySetProvider";
import { flushSync } from "react-dom";
import { elementId } from "src/utils/elementId";
import { LAST_USED_CODE_LANGUAGE_KEY } from "src/utils/codeLanguageStorage";
import { focusBlock } from "src/utils/focusBlock";

export function CodeBlock(props: BlockProps) {
  let { rep, rootEntity } = useReplicache();
  let content = useEntity(props.entityID, "block/code");
  let lang =
    useEntity(props.entityID, "block/code-language")?.data.value || "plaintext";

  let theme =
    useEntity(rootEntity, "theme/code-theme")?.data.value || "github-light";
  let focusedBlock = useUIState(
    (s) => s.focusedEntity?.entityID === props.entityID,
  );
  let entity_set = useEntitySetContext();
  let { permissions } = entity_set;
  const [html, setHTML] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!content) return;
    void codeToHtml(content.data.value, {
      lang,
      theme,
      structure: "classic",
    }).then((h) => {
      setHTML(h.replaceAll("<br>", "\n"));
    });
  }, [content, lang, theme]);

  const onClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    focusBlock(
      { parent: props.parent, value: props.value, type: "code" },
      { type: "end" },
    );
  }, []);
  return (
    <div className="codeBlock w-full flex flex-col rounded-md gap-0.5 ">
      <BlockLayout
        isSelected={focusedBlock}
        hasBackground="accent"
        borderOnHover
        className="p-0! min-h-10 sm:min-h-12"
      >
        {focusedBlock && permissions.write ? (
          <BaseTextareaBlock
            placeholder="write some code…"
            data-editable-block
            data-entityid={props.entityID}
            id={elementId.block(props.entityID).input}
            block={props}
            rep={rep}
            permissionSet={entity_set.set}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            className="codeBlockEditor whitespace-nowrap! overflow-auto! font-mono p-2 sm:p-3"
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
        ) : !html ? (
          <pre
            onClick={onClick}
            onMouseDown={(e) => e.stopPropagation()}
            className="codeBlockRendered overflow-auto! font-mono p-2 sm:p-3 w-full h-full"
          >
            {content?.data.value === "" || content?.data.value === undefined ? (
              <div className="text-tertiary italic">write some code…</div>
            ) : (
              content?.data.value
            )}
          </pre>
        ) : (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onClick}
            data-lang={lang}
            className="contents"
            dangerouslySetInnerHTML={{ __html: html || "" }}
          />
        )}
      </BlockLayout>
      {permissions.write && (
        <div className="text-sm text-tertiary flex w-full justify-between">
          <div className="codeBlockTheme grow flex gap-1">
            Theme:{" "}
            <select
              className="codeBlockThemeSelect text-left bg-transparent pr-1 sm:max-w-none max-w-24 w-full"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              value={theme}
              onChange={async (e) => {
                await rep?.mutate.assertFact({
                  attribute: "theme/code-theme",
                  entity: rootEntity,
                  data: { type: "string", value: e.target.value },
                });
              }}
            >
              {bundledThemesInfo.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayName}
                </option>
              ))}
            </select>
          </div>
          <select
            className="codeBlockLang grow text-right bg-transparent pr-1 sm:max-w-none max-w-24 w-full"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            value={lang}
            onChange={async (e) => {
              localStorage.setItem(LAST_USED_CODE_LANGUAGE_KEY, e.target.value);
              await rep?.mutate.assertFact({
                attribute: "block/code-language",
                entity: props.entityID,
                data: { type: "string", value: e.target.value },
              });
            }}
          >
            <option value="plaintext">Plaintext</option>
            {bundledLanguagesInfo.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
