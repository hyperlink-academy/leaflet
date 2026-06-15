import { MutableRefObject, useCallback } from "react";
import { Fact, ReplicacheMutators, useReplicache } from "src/replicache";
import { EditorView } from "prosemirror-view";
import { setEditorState, useEditorStates } from "src/state/useEditorState";
import {
  DOMParser as ProsemirrorDOMParser,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { schema } from "./schema";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import { addImage } from "src/utils/addImage";
import { BlockProps } from "../Block";
import { focusBlock } from "src/utils/focusBlock";
import { useEntitySetContext } from "components/EntitySetProvider";
import { v7 } from "uuid";
import { Replicache } from "replicache";
import { markdownToHtml } from "src/htmlMarkdownParsers";
import { betterIsUrl } from "src/utils/isURL";
import { TextSelection } from "prosemirror-state";
import type { FilterAttributes } from "src/replicache/attributes";
import { addLinkBlock } from "src/utils/addLinkBlock";
import { UndoManager } from "src/undoManager";
import { prosemirrorToYDoc } from "y-prosemirror";
import * as Y from "yjs";
import * as base64 from "base64-js";
import type { FactInput } from "src/replicache/mutations";

const parser = ProsemirrorDOMParser.fromSchema(schema);

type BlockType = Fact<"block/type">["data"]["value"];

type BuiltBlock = {
  entityID: string;
  parent: string;
  type: BlockType;
  facts: FactInput[];
  parsedContent?: ProsemirrorNode;
};

type ImageRefetchTask = {
  url: string;
  entityID: string;
  attribute: keyof FilterAttributes<{ type: "image" }>;
};

type LinkBlockTask = {
  url: string;
  entityID: string;
};

type BuildResult = {
  blocks: BuiltBlock[];
  extraEntities: Array<{ entityID: string; permission_set: string }>;
  imageTasks: ImageRefetchTask[];
  linkTasks: LinkBlockTask[];
};

const emptyBuildResult = (): BuildResult => ({
  blocks: [],
  extraEntities: [],
  imageTasks: [],
  linkTasks: [],
});

export const useHandlePaste = (
  entityID: string,
  propsRef: MutableRefObject<BlockProps>,
) => {
  let { rep, undoManager } = useReplicache();
  let entity_set = useEntitySetContext();
  return useCallback(
    (view: EditorView, e: ClipboardEvent) => {
      if (!rep) return;
      if (!e.clipboardData) return;
      let textHTML = e.clipboardData.getData("text/html");
      let text = e.clipboardData.getData("text");
      let editorState = useEditorStates.getState().editorStates[entityID];
      if (!editorState) return;
      if (text && betterIsUrl(text)) {
        let selection = view.state.selection as TextSelection;
        let tr = view.state.tr;
        let { from, to } = selection;
        if (selection.empty) {
          tr.insertText(text, selection.from);
          tr.addMark(
            from,
            from + text.length,
            schema.marks.link.create({ href: text }),
          );
        } else {
          tr.addMark(from, to, schema.marks.link.create({ href: text }));
        }
        let oldState = view.state;
        let newState = view.state.apply(tr);
        undoManager.add({
          undo: () => {
            if (!view?.hasFocus()) view?.focus();
            setEditorState(entityID, {
              editor: oldState,
            });
          },
          redo: () => {
            if (!view?.hasFocus()) view?.focus();
            setEditorState(entityID, {
              editor: newState,
            });
          },
        });
        setEditorState(entityID, {
          editor: newState,
        });
        return true;
      }
      // if there is no html, but there is text, convert the text to markdown
      let xml = new DOMParser().parseFromString(textHTML, "text/html");
      if ((!textHTML || !xml.children.length) && text) {
        textHTML = markdownToHtml(text);
      }
      if (textHTML) {
        let parsedXml = new DOMParser().parseFromString(textHTML, "text/html");
        // see stripCommentMarks — this path parses clipboard HTML itself,
        // so the comment-anchor markup is stripped here instead
        for (let anchor of parsedXml.querySelectorAll("span.comment-anchor")) {
          anchor.classList.remove("comment-anchor");
          anchor.removeAttribute("data-comment-id");
        }
        let children = flattenHTMLToTextBlocks(parsedXml.body);
        let hasImage = false;
        for (let item of e.clipboardData.items) {
          if (item.type.includes("image")) hasImage = true;
        }
        if (
          !(children.length === 1 && children[0].tagName === "IMG" && hasImage)
        ) {
          const pasteParent = propsRef.current.listData
            ? propsRef.current.listData.parent
            : propsRef.current.parent;
          const useBulkPath =
            propsRef.current.pageType === "doc" && !isLegacyPasteEnabled();
          if (useBulkPath) {
            bulkPaste({
              children,
              rep,
              undoManager,
              entity_set,
              propsRef,
              pasteParent,
            });
          } else {
            let currentPosition = propsRef.current.position;
            children.forEach((child, index) => {
              createBlockFromHTMLLegacy(child, {
                undoManager,
                parentType: propsRef.current.pageType,
                first: index === 0,
                activeBlockProps: propsRef,
                entity_set,
                rep,
                parent: pasteParent,
                getPosition: () => {
                  currentPosition = generateKeyBetween(
                    currentPosition || null,
                    propsRef.current.nextPosition,
                  );
                  return currentPosition;
                },
                last: index === children.length - 1,
              });
            });
          }
        }
      }

      for (let item of e.clipboardData.items) {
        if (item?.type.includes("image")) {
          let file = item.getAsFile();
          if (file) {
            // Group the block creation/conversion into a single undo step so
            // one Cmd-Z removes the pasted image. The structural mutations are
            // local-only (no network), so awaiting them inside the group is
            // safe — no user edit can interleave in the microtask window. The
            // image facts themselves use ignoreUndo so they don't add steps on
            // top of the group (reverting the block removes them anyway).
            void (async () => {
              let entity: string;
              undoManager.startGroup();
              try {
                if (editorState.editor.doc.textContent.length === 0) {
                  entity = propsRef.current.entityID;
                  await rep.mutate.assertFact({
                    entity: propsRef.current.entityID,
                    attribute: "block/type",
                    data: { type: "block-type-union", value: "image" },
                  });
                  await rep.mutate.retractAttribute({
                    entity: propsRef.current.entityID,
                    attribute: "block/text",
                  });
                } else {
                  entity = v7();
                  await rep.mutate.addBlock({
                    permission_set: entity_set.set,
                    factID: v7(),
                    type: "image",
                    newEntityID: entity,
                    parent: propsRef.current.parent,
                    position: generateKeyBetween(
                      propsRef.current.position,
                      propsRef.current.nextPosition,
                    ),
                  });
                }
              } finally {
                undoManager.endGroup();
              }
              addImage(file, rep, {
                attribute: "block/image",
                entityID: entity,
                ignoreUndo: true,
              });
            })();
          }
          return;
        }
      }
      e.preventDefault();
      e.stopPropagation();
      return true;
    },
    [rep, entity_set, entityID, propsRef, undoManager],
  );
};

function isLegacyPasteEnabled(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      window.localStorage?.getItem("legacyPaste") === "1"
    );
  } catch {
    return false;
  }
}

async function bulkPaste({
  children,
  rep,
  undoManager,
  entity_set,
  propsRef,
  pasteParent,
}: {
  children: HTMLElement[];
  rep: Replicache<ReplicacheMutators>;
  undoManager: UndoManager;
  entity_set: { set: string };
  propsRef: MutableRefObject<BlockProps>;
  pasteParent: string;
}) {
  let result = emptyBuildResult();
  for (const child of children) {
    const r = buildBlockFromHTML(child, {
      parent: pasteParent,
      permission_set: entity_set.set,
    });
    result.blocks.push(...r.blocks);
    result.extraEntities.push(...r.extraEntities);
    result.imageTasks.push(...r.imageTasks);
    result.linkTasks.push(...r.linkTasks);
  }
  if (result.blocks.length === 0) return;

  // Determine if the first built block should reuse the active block.
  const firstBuilt = result.blocks[0];
  const activeType = propsRef.current.type;
  let activeReuse: { content: ProsemirrorNode; type: BlockType } | null = null;
  if (
    firstBuilt &&
    firstBuilt.parent === pasteParent &&
    firstBuilt.parsedContent &&
    (firstBuilt.type === "text" ||
      firstBuilt.type === "heading" ||
      firstBuilt.type === "blockquote") &&
    (activeType === "heading" ||
      activeType === "blockquote" ||
      activeType === firstBuilt.type)
  ) {
    activeReuse = {
      content: firstBuilt.parsedContent,
      type: firstBuilt.type,
    };
  }

  // When active reuse drops the first built block, fan its non-content facts
  // out to the active block: alignment, text-size, list metadata, and any
  // card/block references that connect to nested children. Nested blocks that
  // pointed at firstBuilt as their parent get re-pointed at the active block.
  let bulkBlocks: BuiltBlock[];
  const reuseFacts: FactInput[] = [];
  if (activeReuse) {
    const droppedID = firstBuilt.entityID;
    const activeID = propsRef.current.entityID;
    bulkBlocks = result.blocks
      .slice(1)
      .map((b) => (b.parent === droppedID ? { ...b, parent: activeID } : b));
    for (const f of firstBuilt.facts) {
      if (f.attribute === "block/type" || f.attribute === "block/text")
        continue;
      const remapped: FactInput = { ...f, entity: activeID };
      reuseFacts.push(remapped);
    }
  } else {
    bulkBlocks = result.blocks;
  }
  const topLevel = bulkBlocks.filter((b) => b.parent === pasteParent);
  const positions =
    topLevel.length > 0
      ? generateNKeysBetween(
          propsRef.current.position || null,
          propsRef.current.nextPosition || null,
          topLevel.length,
        )
      : [];
  const positionByEntity = new Map<string, string>();
  topLevel.forEach((b, i) => positionByEntity.set(b.entityID, positions[i]));

  const entities: Array<{ entityID: string; permission_set: string }> & {
    ignoreUndo?: true;
  } = [
    ...bulkBlocks.map((b) => ({
      entityID: b.entityID,
      permission_set: entity_set.set,
    })),
    ...result.extraEntities,
  ];

  const allFacts: FactInput[] & { ignoreUndo?: true } = [];
  for (const b of bulkBlocks) {
    allFacts.push(...b.facts);
    const position = positionByEntity.get(b.entityID);
    if (position !== undefined) {
      allFacts.push({
        entity: b.parent,
        attribute: "card/block",
        data: {
          type: "ordered-reference",
          value: b.entityID,
          position,
        },
      });
    }
  }
  allFacts.push(...reuseFacts);

  // Apply active-block reuse via the live editor BEFORE committing the bulk
  // payload so the user sees the absorbed content immediately. The Replicache
  // commit follows.
  let activeReuseUndo: {
    oldEditorState: EditorState;
    newEditorState: EditorState;
  } | null = null;
  if (activeReuse) {
    const activeID = propsRef.current.entityID;
    const liveState = useEditorStates.getState().editorStates[activeID];
    if (liveState) {
      const oldEditorState = liveState.editor;
      const tr = liveState.editor.tr;
      const sel = liveState.editor.selection;
      if (!sel.empty) {
        tr.delete(sel.from, sel.to);
      }
      tr.replaceSelectionWith(activeReuse.content);
      const newEditorState = liveState.editor.apply(tr);
      setEditorState(activeID, { editor: newEditorState });
      activeReuseUndo = { oldEditorState, newEditorState };
    }
  }

  // Single transaction for entity creation; second for all facts. We split
  // these to fit the existing generic mutators — both honor ignoreUndo.
  entities.ignoreUndo = true;
  allFacts.ignoreUndo = true;
  if (entities.length > 0) await rep.mutate.createEntity(entities);
  if (allFacts.length > 0) await rep.mutate.assertFact(allFacts);

  const activeID = propsRef.current.entityID;
  const newEntityIDs = entities.map((e) => e.entityID);

  // Group the live-editor undo with the bulk undo so a single Cmd-Z reverses
  // the whole paste.
  undoManager.withUndoGroup(() => {
    if (activeReuseUndo) {
      const { oldEditorState, newEditorState } = activeReuseUndo;
      undoManager.add({
        undo: () => {
          const view = useEditorStates.getState().editorStates[activeID]?.view;
          if (view && !view.hasFocus()) view.focus();
          setEditorState(activeID, { editor: oldEditorState });
        },
        redo: () => {
          const view = useEditorStates.getState().editorStates[activeID]?.view;
          if (view && !view.hasFocus()) view.focus();
          setEditorState(activeID, { editor: newEditorState });
        },
      });
    }
    if (newEntityIDs.length > 0) {
      const facts = allFacts.slice();
      undoManager.add({
        undo: async () => {
          for (const id of newEntityIDs) {
            await rep.mutate.deleteEntity({ entity: id, ignoreUndo: true });
          }
        },
        redo: async () => {
          const e = entities.slice() as Array<{
            entityID: string;
            permission_set: string;
          }> & { ignoreUndo?: true };
          const f = facts.slice() as FactInput[] & { ignoreUndo?: true };
          e.ignoreUndo = true;
          f.ignoreUndo = true;
          await rep.mutate.createEntity(e);
          await rep.mutate.assertFact(f);
        },
      });
    }
  });

  // Kick off async work after the bulk commit so the new blocks are already
  // present locally before image/link metadata arrives.
  for (const task of result.linkTasks) {
    addLinkBlock(task.url, task.entityID, rep);
  }
  for (const task of result.imageTasks) {
    fetch(task.url)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], "image.png", { type: blob.type });
        return addImage(file, rep, {
          attribute: task.attribute,
          entityID: task.entityID,
          // The bulk undo group already reverts these entities; skip recording
          // the image facts so they don't add a stray undo step on top.
          ignoreUndo: true,
        });
      })
      .catch(() => {
        // Image refetch failed; leave the placeholder block. The renderer
        // already handles missing image data.
      });
  }

  // Cursor placement: focus the end of the last bulk-added block, or the
  // active block if reuse absorbed everything.
  const lastBulk = bulkBlocks[bulkBlocks.length - 1];
  if (lastBulk) {
    focusBlock(
      {
        value: lastBulk.entityID,
        type: lastBulk.type,
        parent: lastBulk.parent,
      },
      { type: "end" },
    );
  } else if (activeReuse) {
    focusBlock(
      {
        value: propsRef.current.entityID,
        type: activeReuse.type,
        parent: propsRef.current.parent,
      },
      { type: "end" },
    );
  }
}

function buildBlockFromHTML(
  child: Element,
  opts: {
    parent: string;
    permission_set: string;
    listStyle?: "ordered" | "unordered";
  },
): BuildResult {
  const { parent, permission_set, listStyle } = opts;
  const result = emptyBuildResult();

  if (child.tagName === "UL" || child.tagName === "OL") {
    const childListStyle = child.tagName === "OL" ? "ordered" : "unordered";
    for (const c of Array.from(child.children)) {
      const r = buildBlockFromHTML(c, {
        parent,
        permission_set,
        listStyle: childListStyle,
      });
      result.blocks.push(...r.blocks);
      result.extraEntities.push(...r.extraEntities);
      result.imageTasks.push(...r.imageTasks);
      result.linkTasks.push(...r.linkTasks);
    }
    return result;
  }

  // Initial type from tagName; may be overridden below.
  let baseType: BlockType | null;
  let headingLevel: number | null = null;
  switch (child.tagName) {
    case "BLOCKQUOTE":
      baseType = "blockquote";
      break;
    case "LI":
    case "SPAN":
      baseType = "text";
      break;
    case "PRE":
      baseType = "code";
      break;
    case "P":
      baseType = "text";
      break;
    case "H1":
      baseType = "heading";
      headingLevel = 1;
      break;
    case "H2":
      baseType = "heading";
      headingLevel = 2;
      break;
    case "H3":
      baseType = "heading";
      headingLevel = 3;
      break;
    case "H4":
      baseType = "heading";
      headingLevel = 4;
      break;
    case "DIV":
      baseType = "card";
      break;
    case "IMG":
      baseType = "image";
      break;
    case "A":
      baseType = "link";
      break;
    case "HR":
      baseType = "horizontal-rule";
      break;
    default:
      baseType = null;
  }
  if (!baseType) return result;

  // Special DIV variants determine final type.
  const isMath = child.tagName === "DIV" && !!child.getAttribute("data-tex");
  const isBlueskyPost =
    child.tagName === "DIV" && !!child.getAttribute("data-bluesky-post");
  const isCardPaste =
    child.tagName === "DIV" && !!child.getAttribute("data-entityid");
  const aHref = child.tagName === "A" ? child.getAttribute("href") : null;
  const aIsButton =
    child.tagName === "A" && child.getAttribute("data-type") === "button";

  // A with no href is invalid as a link block; skip it.
  if (child.tagName === "A" && !aHref) return result;

  let finalType: BlockType = baseType;
  if (isMath) finalType = "math";
  else if (isBlueskyPost) finalType = "bluesky-post";
  else if (aIsButton && aHref) finalType = "button";

  const entityID = v7();
  const facts: FactInput[] = [];
  let parsedContent: ProsemirrorNode | undefined;

  // block/type is emitted for everything except A-without-buttondata (link
  // blocks) — addLinkBlock writes the type asynchronously based on metadata.
  const isLink = child.tagName === "A" && !aIsButton;
  if (!isLink) {
    facts.push({
      entity: entityID,
      attribute: "block/type",
      data: { type: "block-type-union", value: finalType },
    });
  }

  if (finalType === "heading" && headingLevel) {
    facts.push({
      entity: entityID,
      attribute: "block/heading-level",
      data: { type: "number", value: headingLevel },
    });
  }

  const alignment = child.getAttribute("data-alignment");
  if (alignment && ["right", "left", "center"].includes(alignment)) {
    facts.push({
      entity: entityID,
      attribute: "block/text-alignment",
      data: {
        type: "text-alignment-type-union",
        value: alignment as "right" | "left" | "center",
      },
    });
  }

  const textSize = child.getAttribute("data-text-size");
  if (textSize && ["default", "small", "large"].includes(textSize)) {
    facts.push({
      entity: entityID,
      attribute: "block/text-size",
      data: {
        type: "text-size-union",
        value: textSize as "default" | "small" | "large",
      },
    });
  }

  // block/text — Yjs-encode parsed content for text-ish blocks only.
  if (
    (finalType === "text" ||
      finalType === "heading" ||
      finalType === "blockquote") &&
    child.tagName !== "PRE"
  ) {
    const doc = parser.parse(child);
    parsedContent = doc;
    const ydoc = prosemirrorToYDoc(doc, "prosemirror");
    const update = Y.encodeStateAsUpdate(ydoc);
    facts.push({
      entity: entityID,
      attribute: "block/text",
      data: { type: "text", value: base64.fromByteArray(update) },
    });
    ydoc.destroy();
  }

  // PRE → code body. data-lang is Leaflet's own exact language; fall back to a
  // language-* class (markdown fenced code) and then data-language.
  if (child.tagName === "PRE" && child.textContent) {
    let lang = child.getAttribute("data-lang");
    if (!lang && child.firstElementChild?.className) {
      const match =
        child.firstElementChild.className.match(/language-([\w.+-]+)/);
      if (match) lang = match[1];
    }
    if (!lang) lang = child.getAttribute("data-language") || "plaintext";
    facts.push({
      entity: entityID,
      attribute: "block/code-language",
      data: { type: "string", value: lang },
    });
    facts.push({
      entity: entityID,
      attribute: "block/code",
      // markdown→HTML wraps the body in extra blank lines; strip them so pasted
      // code doesn't gain leading/trailing empty lines.
      data: {
        type: "string",
        value: child.textContent.replace(/^\n+|\n+$/g, ""),
      },
    });
  }

  // Button variant of A
  if (aIsButton && aHref) {
    facts.push({
      entity: entityID,
      attribute: "button/text",
      data: { type: "string", value: child.textContent || "" },
    });
    facts.push({
      entity: entityID,
      attribute: "button/url",
      data: { type: "string", value: aHref },
    });
  }

  // Plain link → queue addLinkBlock (metadata + type written async)
  if (isLink && aHref) {
    result.linkTasks.push({ url: aHref, entityID });
  }

  // IMG → placeholder + async fetch+upload
  if (child.tagName === "IMG") {
    const src = child.getAttribute("src");
    if (src) {
      result.imageTasks.push({
        url: src,
        entityID,
        attribute: "block/image",
      });
    }
  }

  // DIV with data-tex → math (markdown "$$…$$" wraps the tex in newlines)
  if (isMath) {
    const tex = child.getAttribute("data-tex");
    facts.push({
      entity: entityID,
      attribute: "block/math",
      data: { type: "string", value: (tex || "").trim() },
    });
  }

  // DIV with data-bluesky-post
  if (isBlueskyPost) {
    const postData = child.getAttribute("data-bluesky-post");
    if (postData) {
      try {
        facts.push({
          entity: entityID,
          attribute: "block/bluesky-post",
          data: { type: "bluesky-post", value: JSON.parse(postData) },
        });
      } catch {
        // Malformed bluesky-post payload — leave as a bare bluesky-post block.
      }
    }
  }

  // Card paste — recreate nested entities and remap references.
  if (isCardPaste) {
    const oldRootID = child.getAttribute("data-entityid") as string;
    const factsData = child.getAttribute("data-facts");
    if (factsData) {
      let cardFacts: Fact<any>[] = [];
      try {
        cardFacts = JSON.parse(factsData) as Fact<any>[];
      } catch {
        cardFacts = [];
      }
      const oldToNew: { [k: string]: string } = {};
      const seen = new Set<string>();
      for (const f of cardFacts) {
        if (!seen.has(f.entity)) {
          seen.add(f.entity);
          const newID = v7();
          oldToNew[f.entity] = newID;
          result.extraEntities.push({ entityID: newID, permission_set });
        }
      }
      for (const fact of cardFacts) {
        const newEntity = oldToNew[fact.entity];
        if (!newEntity) continue;
        const data = { ...fact.data };
        if (
          data.type === "ordered-reference" ||
          data.type === "spatial-reference" ||
          data.type === "reference"
        ) {
          data.value = oldToNew[data.value] ?? data.value;
        }
        if (data.type === "image") {
          result.imageTasks.push({
            url: data.src,
            entityID: newEntity,
            attribute: fact.attribute,
          });
        } else {
          facts.push({
            entity: newEntity,
            attribute: fact.attribute,
            data,
          } as FactInput);
        }
      }
      const newRootID = oldToNew[oldRootID];
      if (newRootID) {
        facts.push({
          entity: entityID,
          attribute: "block/card",
          data: { type: "reference", value: newRootID },
        });
      }
    }
  }

  // LI metadata + nested-list children
  if (child.tagName === "LI") {
    const nestedList = Array.from(child.children)
      .flatMap((f) => flattenHTMLToTextBlocks(f as HTMLElement))
      .find((f) => f.tagName === "UL" || f.tagName === "OL");
    const checked = child.getAttribute("data-checked");
    if (checked !== null) {
      facts.push({
        entity: entityID,
        attribute: "block/check-list",
        data: { type: "boolean", value: checked === "true" },
      });
    }
    facts.push({
      entity: entityID,
      attribute: "block/is-list",
      data: { type: "boolean", value: true },
    });
    if (listStyle) {
      facts.push({
        entity: entityID,
        attribute: "block/list-style",
        data: { type: "list-style-union", value: listStyle },
      });
    }
    if (nestedList) {
      const nested = buildBlockFromHTML(nestedList, {
        parent: entityID,
        permission_set,
      });
      const nestedTopLevel = nested.blocks.filter((b) => b.parent === entityID);
      if (nestedTopLevel.length > 0) {
        const nestedPositions = generateNKeysBetween(
          null,
          null,
          nestedTopLevel.length,
        );
        nestedTopLevel.forEach((nb, i) => {
          facts.push({
            entity: entityID,
            attribute: "card/block",
            data: {
              type: "ordered-reference",
              value: nb.entityID,
              position: nestedPositions[i],
            },
          });
        });
      }
      result.blocks.push(...nested.blocks);
      result.extraEntities.push(...nested.extraEntities);
      result.imageTasks.push(...nested.imageTasks);
      result.linkTasks.push(...nested.linkTasks);
    }
  }

  result.blocks.unshift({
    entityID,
    parent,
    type: finalType,
    facts,
    parsedContent,
  });
  return result;
}

const LEGACY_FLATTEN_TAGS = new Set([
  "BLOCKQUOTE",
  "P",
  "PRE",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "UL",
  "OL",
  "IMG",
  "A",
  "SPAN",
  "HR",
]);

function flattenHTMLToTextBlocks(element: HTMLElement): HTMLElement[] {
  function collectHTML(node: Node, htmlBlocks: HTMLElement[]): void {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent && node.textContent.trim() !== "") {
        let newElement = document.createElement("p");
        newElement.textContent = node.textContent;
        htmlBlocks.push(newElement);
      }
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const elementNode = node as HTMLElement;
      const isSpecialBlock =
        elementNode.getAttribute("data-entityid") ||
        elementNode.getAttribute("data-tex") ||
        elementNode.getAttribute("data-bluesky-post");
      // A <p> that only wraps a special block (e.g. inline "$$…$$" math, which
      // markdown nests inside a paragraph) should yield the inner block rather
      // than a text block, so recurse into it instead of pushing the <p>.
      const wrapsOnlySpecialBlock =
        elementNode.tagName === "P" &&
        !isSpecialBlock &&
        !!elementNode.querySelector(
          "[data-tex], [data-entityid], [data-bluesky-post]",
        ) &&
        !Array.from(elementNode.childNodes).some(
          (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim() !== "",
        );
      if (
        (LEGACY_FLATTEN_TAGS.has(elementNode.tagName) || isSpecialBlock) &&
        !wrapsOnlySpecialBlock
      ) {
        htmlBlocks.push(elementNode);
      } else {
        for (let child of node.childNodes) {
          collectHTML(child, htmlBlocks);
        }
      }
    }
  }

  const htmlBlocks: HTMLElement[] = [];
  collectHTML(element, htmlBlocks);
  return htmlBlocks;
}

// Legacy per-block paste path. Kept for canvas paste (parentType === "canvas")
// and as a localStorage("legacyPaste") = "1" kill-switch escape hatch for doc
// paste. Delete in a follow-up release.
const createBlockFromHTMLLegacy = (
  child: Element,
  {
    first,
    last,
    activeBlockProps,
    rep,
    undoManager,
    entity_set,
    getPosition,
    parent,
    parentType,
    listStyle,
    depth = 1,
  }: {
    parentType: "canvas" | "doc";
    parent: string;
    first: boolean;
    last: boolean;
    activeBlockProps?: MutableRefObject<BlockProps>;
    rep: Replicache<ReplicacheMutators>;
    undoManager: UndoManager;
    entity_set: { set: string };
    getPosition: () => string;
    listStyle?: "ordered" | "unordered";
    depth?: number;
  },
) => {
  let type: Fact<"block/type">["data"]["value"] | null;
  let headingLevel: number | null = null;
  let hasChildren = false;

  if (child.tagName === "UL" || child.tagName === "OL") {
    let children = Array.from(child.children);
    if (children.length > 0) hasChildren = true;
    const childListStyle = child.tagName === "OL" ? "ordered" : "unordered";
    for (let c of children) {
      createBlockFromHTMLLegacy(c, {
        first: first && c === children[0],
        last: last && c === children[children.length - 1],
        activeBlockProps,
        rep,
        undoManager,
        entity_set,
        getPosition,
        parent,
        parentType,
        listStyle: childListStyle,
        depth,
      });
    }
  }
  switch (child.tagName) {
    case "BLOCKQUOTE": {
      type = "blockquote";
      break;
    }
    case "LI":
    case "SPAN": {
      type = "text";
      break;
    }
    case "PRE": {
      type = "code";
      break;
    }
    case "P": {
      type = "text";
      break;
    }
    case "H1": {
      headingLevel = 1;
      type = "heading";
      break;
    }
    case "H2": {
      headingLevel = 2;
      type = "heading";
      break;
    }
    case "H3": {
      headingLevel = 3;
      type = "heading";
      break;
    }
    case "H4": {
      headingLevel = 4;
      type = "heading";
      break;
    }
    case "DIV": {
      type = "card";
      break;
    }
    case "IMG": {
      type = "image";
      break;
    }
    case "A": {
      // Only explicit buttons get their own block; plain links are
      // autolinked inline as a link mark within a text block.
      type = child.getAttribute("data-type") === "button" ? "link" : "text";
      break;
    }
    case "HR": {
      type = "horizontal-rule";
      break;
    }
    default:
      type = null;
  }
  let content = parser.parse(child);
  if (!type) return;

  let entityID: string;
  let position: string;
  if (
    (parentType === "canvas" && activeBlockProps?.current) ||
    (first &&
      (activeBlockProps?.current.type === "heading" ||
        activeBlockProps?.current.type === "blockquote" ||
        type === activeBlockProps?.current.type))
  )
    entityID = activeBlockProps.current.entityID;
  else {
    entityID = v7();
    if (parentType === "doc") {
      position = getPosition();
      rep.mutate.addBlock({
        permission_set: entity_set.set,
        factID: v7(),
        newEntityID: entityID,
        parent: parent,
        type: type,
        position,
      });
    }
    if (type === "heading" && headingLevel) {
      rep.mutate.assertFact({
        entity: entityID,
        attribute: "block/heading-level",
        data: { type: "number", value: headingLevel },
      });
    }
  }
  let alignment = child.getAttribute("data-alignment");
  if (alignment && ["right", "left", "center"].includes(alignment)) {
    rep.mutate.assertFact({
      entity: entityID,
      attribute: "block/text-alignment",
      data: {
        type: "text-alignment-type-union",
        value: alignment as "right" | "left" | "center",
      },
    });
  }
  let textSize = child.getAttribute("data-text-size");
  if (textSize && ["default", "small", "large"].includes(textSize)) {
    rep.mutate.assertFact({
      entity: entityID,
      attribute: "block/text-size",
      data: {
        type: "text-size-union",
        value: textSize as "default" | "small" | "large",
      },
    });
  }
  if (child.tagName === "A") {
    let href = child.getAttribute("href");
    let dataType = child.getAttribute("data-type");
    if (href && dataType === "button") {
      rep.mutate.assertFact([
        {
          entity: entityID,
          attribute: "block/type",
          data: { type: "block-type-union", value: "button" },
        },
        {
          entity: entityID,
          attribute: "button/text",
          data: { type: "string", value: child.textContent || "" },
        },
        {
          entity: entityID,
          attribute: "button/url",
          data: { type: "string", value: href },
        },
      ]);
    }
    // Non-button links fall through and are parsed inline as a link mark
    // (see the parser.parse(child) handling below) rather than becoming a
    // standalone link block.
  }
  if (child.tagName === "PRE") {
    let lang = child.getAttribute("data-lang");
    if (!lang && child.firstElementChild?.className) {
      let match =
        child.firstElementChild.className.match(/language-([\w.+-]+)/);
      if (match) lang = match[1];
    }
    if (!lang) lang = child.getAttribute("data-language") || "plaintext";
    if (child.textContent) {
      rep.mutate.assertFact([
        {
          entity: entityID,
          attribute: "block/type",
          data: { type: "block-type-union", value: "code" },
        },
        {
          entity: entityID,
          attribute: "block/code-language",
          data: { type: "string", value: lang },
        },
        {
          entity: entityID,
          attribute: "block/code",
          data: {
            type: "string",
            value: child.textContent.replace(/^\n+|\n+$/g, ""),
          },
        },
      ]);
    }
  }
  if (child.tagName === "IMG") {
    let src = child.getAttribute("src");
    if (src) {
      fetch(src)
        .then((res) => res.blob())
        .then((Blob) => {
          const file = new File([Blob], "image.png", { type: Blob.type });
          addImage(file, rep, {
            attribute: "block/image",
            entityID: entityID,
          });
        })
        .catch(() => {});
    }
  }
  if (child.tagName === "DIV" && child.getAttribute("data-tex")) {
    let tex = child.getAttribute("data-tex");
    rep.mutate.assertFact([
      {
        entity: entityID,
        attribute: "block/type",
        data: { type: "block-type-union", value: "math" },
      },
      {
        entity: entityID,
        attribute: "block/math",
        data: { type: "string", value: (tex || "").trim() },
      },
    ]);
  }

  if (child.tagName === "DIV" && child.getAttribute("data-bluesky-post")) {
    let postData = child.getAttribute("data-bluesky-post");
    if (postData) {
      rep.mutate.assertFact([
        {
          entity: entityID,
          attribute: "block/type",
          data: { type: "block-type-union", value: "bluesky-post" },
        },
        {
          entity: entityID,
          attribute: "block/bluesky-post",
          data: { type: "bluesky-post", value: JSON.parse(postData) },
        },
      ]);
    }
  }

  if (child.tagName === "DIV" && child.getAttribute("data-entityid")) {
    let oldEntityID = child.getAttribute("data-entityid") as string;
    let factsData = child.getAttribute("data-facts");
    if (factsData) {
      let facts = JSON.parse(factsData) as Fact<any>[];

      let oldEntityIDToNewID = {} as { [k: string]: string };
      let oldEntities = facts.reduce((acc, f) => {
        if (!acc.includes(f.entity)) acc.push(f.entity);
        return acc;
      }, [] as string[]);
      let newEntities = [] as string[];
      for (let oldEntity of oldEntities) {
        let newEntity = v7();
        oldEntityIDToNewID[oldEntity] = newEntity;
        newEntities.push(newEntity);
      }

      let newFacts = [] as Array<
        Pick<Fact<any>, "entity" | "attribute" | "data">
      >;
      for (let fact of facts) {
        let entity = oldEntityIDToNewID[fact.entity];
        let data = fact.data;
        if (
          data.type === "ordered-reference" ||
          data.type == "spatial-reference" ||
          data.type === "reference"
        ) {
          data.value = oldEntityIDToNewID[data.value];
        }
        if (data.type === "image") {
          //idk get it from the clipboard maybe?
        }
        newFacts.push({ entity, attribute: fact.attribute, data });
      }
      rep.mutate.createEntity(
        newEntities.map((e) => ({
          entityID: e,
          permission_set: entity_set.set,
        })),
      );
      rep.mutate.assertFact(newFacts.filter((f) => f.data.type !== "image"));
      let newCardEntity = oldEntityIDToNewID[oldEntityID];
      rep.mutate.assertFact({
        entity: entityID,
        attribute: "block/card",
        data: { type: "reference", value: newCardEntity },
      });
      let images: Pick<
        Fact<keyof FilterAttributes<{ type: "image" }>>,
        "entity" | "data" | "attribute"
      >[] = newFacts.filter((f) => f.data.type === "image");
      for (let image of images) {
        fetch(image.data.src)
          .then((res) => res.blob())
          .then((Blob) => {
            const file = new File([Blob], "image.png", { type: Blob.type });
            addImage(file, rep, {
              attribute: image.attribute,
              entityID: image.entity,
            });
          })
          .catch(() => {});
      }
    }
  }

  if (child.tagName === "LI") {
    let nestedList = Array.from(child.children)
      .flatMap((f) => flattenHTMLToTextBlocks(f as HTMLElement))
      .find((f) => f.tagName === "UL" || f.tagName === "OL");
    let checked = child.getAttribute("data-checked");
    if (checked !== null) {
      rep.mutate.assertFact({
        entity: entityID,
        attribute: "block/check-list",
        data: { type: "boolean", value: checked === "true" ? true : false },
      });
    }
    rep.mutate.assertFact({
      entity: entityID,
      attribute: "block/is-list",
      data: { type: "boolean", value: true },
    });
    if (listStyle) {
      rep.mutate.assertFact({
        entity: entityID,
        attribute: "block/list-style",
        data: { type: "list-style-union", value: listStyle },
      });
    }
    if (nestedList) {
      hasChildren = true;
      let currentPosition: string | null = null;
      createBlockFromHTMLLegacy(nestedList, {
        parentType,
        first: false,
        last: last,
        activeBlockProps,
        rep,
        undoManager,
        entity_set,
        getPosition: () => {
          currentPosition = generateKeyBetween(currentPosition, null);
          return currentPosition;
        },
        parent: entityID,
        depth: depth + 1,
      });
    }
  }

  setTimeout(() => {
    let block = useEditorStates.getState().editorStates[entityID];
    if (block) {
      let tr = block.editor.tr;
      if (
        block.editor.selection.from !== undefined &&
        block.editor.selection.to !== undefined
      )
        tr.delete(block.editor.selection.from, block.editor.selection.to);
      tr.replaceSelectionWith(content);
      let newState = block.editor.apply(tr);
      setEditorState(entityID, {
        editor: newState,
      });

      undoManager.add({
        redo: () => {
          useEditorStates.setState((oldState) => {
            let view = oldState.editorStates[entityID]?.view;
            if (!view?.hasFocus()) view?.focus();
            return {
              editorStates: {
                ...oldState.editorStates,
                [entityID]: {
                  ...oldState.editorStates[entityID]!,
                  editor: newState,
                },
              },
            };
          });
        },
        undo: () => {
          useEditorStates.setState((oldState) => {
            let view = oldState.editorStates[entityID]?.view;
            if (!view?.hasFocus()) view?.focus();
            return {
              editorStates: {
                ...oldState.editorStates,
                [entityID]: {
                  ...oldState.editorStates[entityID]!,
                  editor: block.editor,
                },
              },
            };
          });
        },
      });
    }
    if (last && !hasChildren && !first) {
      focusBlock(
        {
          value: entityID,
          type: type,
          parent: parent,
        },
        { type: "end" },
      );
    }
  }, 10);
};
