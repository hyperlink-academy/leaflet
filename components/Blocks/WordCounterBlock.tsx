"use client";

import { useMemo } from "react";
import * as base64 from "base64-js";
import * as Y from "yjs";
import { BlockLayout, BlockProps } from "./Block";
import { useEntity, useReplicache } from "src/replicache";
import { useIsBlockSelected } from "src/useUIState";
import { useEditorStates } from "src/state/useEditorState";
import { useSubscribe } from "src/replicache/useSubscribe";
import { Popover } from "components/Popover";
import { Toggle } from "components/Toggle";
import { SettingsTriggerButton } from "./SettingsTriggerButton";
import { YJSFragmentToString } from "src/utils/yjsFragmentToString";

type CounterAttribute =
  | "card/block"
  | "block/type"
  | "block/card"
  | "block/text";
type CounterFact = {
  id: string;
  entity: string;
  attribute: CounterAttribute;
  data: { value: string; position?: string };
};

export function WordCounterBlock(props: BlockProps & { preview?: boolean }) {
  let isSelected = useIsBlockSelected(props.entityID);
  let onlyCountBelow =
    useEntity(props.entityID, "word-counter/only-count-below")?.data.value ??
    false;
  let includeSubpages =
    useEntity(props.entityID, "word-counter/include-subpages")?.data.value ??
    false;
  let facts = useDocumentFacts(props.parent, !onlyCountBelow && includeSubpages);
  // Prefer mounted editors so the counter updates with each keystroke instead
  // of waiting for the Yjs document's debounced persistence.
  let editorStates = useEditorStates((state) => state.editorStates);
  let liveText = useMemo(
    () =>
      new Map(
        Object.entries(editorStates).flatMap(([entityID, state]) =>
          state ? [[entityID, state.editor.doc.textContent] as const] : [],
        ),
      ),
    [editorStates],
  );

  let text = useMemo(
    () =>
      counterText(facts, props.parent, props.entityID, {
        onlyCountBelow,
        includeSubpages: !onlyCountBelow && includeSubpages,
        liveText,
      }),
    [facts, props.parent, props.entityID, onlyCountBelow, includeSubpages, liveText],
  );
  let words = wordCount(text);

  return (
    <BlockLayout
      isSelected={!!isSelected}
      hasBackground="accent"
      className="rounded-lg"
      extraOptions={
        !props.preview ? (
          <WordCounterOptions
            entityID={props.entityID}
            onlyCountBelow={onlyCountBelow}
            includeSubpages={includeSubpages}
          />
        ) : undefined
      }
    >
      <div className="flex flex-col gap-0.5 text-primary">
        <div className="font-bold">Words: {words}</div>
        <div className="text-sm text-secondary">Characters: {text.length}</div>
        {onlyCountBelow && (
          <div className="mt-1 text-xs italic text-secondary">
            Only counting words below this block
          </div>
        )}
        {!onlyCountBelow && includeSubpages && (
          <div className="mt-1 text-xs italic text-secondary">
            Showing count for subpages!
          </div>
        )}
      </div>
    </BlockLayout>
  );
}

function WordCounterOptions(props: {
  entityID: string;
  onlyCountBelow: boolean;
  includeSubpages: boolean;
}) {
  let { rep } = useReplicache();
  let setPreference = (attribute: "word-counter/only-count-below" | "word-counter/include-subpages", value: boolean) =>
    rep?.mutate.assertFact({
      entity: props.entityID,
      attribute,
      data: { type: "boolean", value },
    });

  return (
    <Popover
      asChild
      side="top"
      align="end"
      sideOffset={6}
      className="w-full sm:w-md"
      trigger={<SettingsTriggerButton aria-label="Word Counter Settings" />}
    >
      <div className="flex min-w-[220px] flex-col gap-3 py-1 text-primary">
        <Toggle
          fullWidth
          toggle={props.onlyCountBelow}
          onToggle={() => {
            setPreference("word-counter/only-count-below", !props.onlyCountBelow);
            if (!props.onlyCountBelow && props.includeSubpages)
              setPreference("word-counter/include-subpages", false);
          }}
        >
          <strong>Only Count Below Block</strong>
        </Toggle>
        <div className={props.onlyCountBelow ? "cursor-not-allowed opacity-50" : ""}>
          <Toggle
            fullWidth
            toggle={props.includeSubpages}
            onToggle={() => {
              if (!props.onlyCountBelow)
                setPreference("word-counter/include-subpages", !props.includeSubpages);
            }}
          >
            <strong>Include Subpages</strong>
          </Toggle>
        </div>
      </div>
    </Popover>
  );
}

function useDocumentFacts(pageID: string, includeSubpages: boolean): CounterFact[] {
  let { rep, initialFacts } = useReplicache();
  return useSubscribe(
    rep,
    async (tx) => {
      let initialized = await tx.get("initialized");
      if (!initialized) return [] as CounterFact[];
      let result: CounterFact[] = [];
      let seenContainers = new Set<string>();
      let scan = async (entity: string, attribute: CounterAttribute) =>
        (await tx
          .scan<CounterFact>({
            indexName: "eav",
            prefix: `${entity}-${attribute}`,
          })
          .toArray())
          .filter((fact) => fact.attribute === attribute);
      let walk = async (container: string) => {
        if (seenContainers.has(container)) return;
        seenContainers.add(container);
        let children = await scan(container, "card/block");
        result.push(...children);
        for (let child of children) {
          let [type] = await scan(child.data.value, "block/type");
          if (type) result.push(type);
          let [text] = await scan(child.data.value, "block/text");
          if (text) result.push(text);
          await walk(child.data.value);
          if (includeSubpages && type?.data.value === "card") {
            let [childPage] = await scan(child.data.value, "block/card");
            if (childPage) {
              result.push(childPage);
              await walk(childPage.data.value);
            }
          }
        }
      };
      await walk(pageID);
      return result;
    },
    {
      default: initialFacts.filter(
        (fact) =>
          fact.attribute === "card/block" ||
          fact.attribute === "block/type" ||
          fact.attribute === "block/card" ||
          fact.attribute === "block/text",
      ) as unknown as CounterFact[],
      dependencies: [initialFacts, pageID, includeSubpages],
    },
  ) as CounterFact[];
}

export function counterText(
  facts: readonly CounterFact[],
  pageID: string,
  counterID: string,
  options: {
    onlyCountBelow: boolean;
    includeSubpages: boolean;
    liveText?: ReadonlyMap<string, string>;
  },
) {
  let byEntity = new Map<string, CounterFact[]>();
  for (let fact of facts) {
    let entityFacts = byEntity.get(fact.entity) ?? [];
    entityFacts.push(fact);
    byEntity.set(fact.entity, entityFacts);
  }
  let factsFor = (entity: string, attribute: CounterAttribute) =>
    (byEntity.get(entity) ?? []).filter((fact) => fact.attribute === attribute);

  let blocksOnPage = (page: string) => {
    let result: string[] = [];
    let walk = (container: string) => {
      let children = factsFor(container, "card/block").toSorted((a, b) =>
        (a.data.position ?? "").localeCompare(b.data.position ?? ""),
      );
      for (let child of children) {
        result.push(child.data.value);
        walk(child.data.value);
      }
    };
    walk(page);
    return result;
  };

  let countedPages = new Set<string>();
  let collect = (page: string, afterCounter: boolean) => {
    if (countedPages.has(page)) return [] as string[];
    countedPages.add(page);
    let blocks = blocksOnPage(page);
    let start = afterCounter ? blocks.indexOf(counterID) + 1 : 0;
    if (afterCounter && start === 0) return [];
    let text = blocks.slice(start).flatMap((blockID) => {
      let type = factsFor(blockID, "block/type")[0]?.data.value;
      if (type !== "text" && type !== "heading" && type !== "blockquote") return [];
      let liveValue = options.liveText?.get(blockID);
      if (liveValue !== undefined) return [liveValue];
      let value = factsFor(blockID, "block/text")[0]?.data.value;
      return value ? [plainText(value)] : [];
    });
    if (options.includeSubpages && !afterCounter) {
      for (let blockID of blocks) {
        if (factsFor(blockID, "block/type")[0]?.data.value !== "card") continue;
        let childPage = factsFor(blockID, "block/card")[0]?.data.value;
        if (childPage) text.push(...collect(childPage, false));
      }
    }
    return text;
  };

  return collect(pageID, options.onlyCountBelow)
    .filter((value) => value.length > 0)
    .join("\n");
}

function plainText(value: string) {
  try {
    let doc = new Y.Doc();
    Y.applyUpdate(doc, base64.toByteArray(value));
    let node = doc.getXmlElement("prosemirror").toArray()[0];
    return node ? YJSFragmentToString(node) : "";
  } catch {
    return "";
  }
}

export function wordCount(text: string) {
  return Array.from(text.matchAll(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu)).length;
}
