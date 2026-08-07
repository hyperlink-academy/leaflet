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
import { addImage, prepareImage } from "src/utils/addImage";
import { BlockProps } from "../Block";
import { focusBlock } from "src/utils/focusBlock";
import { useEntitySetContext } from "components/EntitySetProvider";
import { v7 } from "uuid";
import { Replicache } from "replicache";
import { markdownToHtml } from "src/htmlMarkdownParsers";
import { betterIsUrl } from "src/utils/isURL";
import { TextSelection } from "prosemirror-state";
import type { FilterAttributes } from "src/replicache/attributes";
import { UndoManager } from "src/undoManager";
import type { FactInput } from "src/replicache/mutations";
import {
  buildBlocksFromElements,
  flattenHTMLToTextBlocks,
  parsePasteHTMLToElements,
  type BlockType,
  type BuiltBlock,
} from "src/utils/paste/htmlToBlocks";
import { resolveCopiedFootnoteRefs } from "src/utils/paste/resolveCopiedFootnoteRefs";
import { renderFootnoteDefHTML } from "src/utils/renderFootnoteDefHTML";
import { scanIndex } from "src/replicache/utils";

const parser = ProsemirrorDOMParser.fromSchema(schema);

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
        let children = parsePasteHTMLToElements(textHTML);
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
          resolveCopiedFootnoteRefs(children, (footnoteEntityID) =>
            rep.query(async (tx) => {
              let [text] = await scanIndex(tx).eav(
                footnoteEntityID,
                "block/text",
              );
              return text ? renderFootnoteDefHTML(text.data.value) : null;
            }),
          ).then(() => {
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
          });
        }
      }

      for (let item of e.clipboardData.items) {
        if (item?.type.includes("image")) {
          let file = item.getAsFile();
          if (file) {
            // Decode the image FIRST, then commit the block's structural facts
            // (type / card/block) together with the optimistic block/image fact
            // in a single transaction. Committing them atomically means the block
            // never paints as an image-type block with no image — i.e. no empty
            // "Upload An Image" placeholder flashes before the picture appears.
            // The whole structural commit is one undo group (one Cmd-Z removes
            // the pasted image); finishUpload writes the post-upload fact with
            // ignoreUndo so it doesn't add a stray step on top of the group.
            const intoEmptyBlock =
              editorState.editor.doc.textContent.length === 0;
            const entity = intoEmptyBlock ? propsRef.current.entityID : v7();
            const parent = propsRef.current.parent;
            const position = generateKeyBetween(
              propsRef.current.position,
              propsRef.current.nextPosition,
            );
            prepareImage(file, rep, {
              attribute: "block/image",
              entityID: entity,
              ignoreUndo: true,
            })
              .then(async ({ imageFact, finishUpload }) => {
                // finally → finishUpload guarantees the concurrency slot is
                // released even if a commit throws.
                try {
                  if (intoEmptyBlock) {
                    await undoManager.withUndoGroup(async () => {
                      await rep.mutate.assertFact([
                        {
                          entity,
                          attribute: "block/type",
                          data: { type: "block-type-union", value: "image" },
                        },
                        imageFact,
                      ]);
                      await rep.mutate.retractAttribute({
                        entity,
                        attribute: "block/text",
                      });
                    });
                  } else {
                    // createEntity first (it renders nothing until referenced),
                    // then commit the card/block reference, type, and image fact
                    // in one transaction so the new block appears with its image.
                    await rep.mutate.createEntity([
                      { entityID: entity, permission_set: entity_set.set },
                    ]);
                    await undoManager.withUndoGroup(() =>
                      rep.mutate.assertFact([
                        {
                          entity: parent,
                          id: v7(),
                          attribute: "card/block",
                          data: {
                            type: "ordered-reference",
                            value: entity,
                            position,
                          },
                        },
                        {
                          entity,
                          attribute: "block/type",
                          data: { type: "block-type-union", value: "image" },
                        },
                        imageFact,
                      ]),
                    );
                  }
                } finally {
                  await finishUpload();
                }
              })
              .catch(() => {});
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
  let result = buildBlocksFromElements(children, {
    parent: pasteParent,
    permission_set: entity_set.set,
  });
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
      // Only facts on the dropped block itself move to the active block; facts
      // the builder emitted for other entities (footnote content) stay put.
      if (f.entity !== droppedID) {
        reuseFacts.push(f);
        continue;
      }
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

  // Refetch images after the bulk commit so the new blocks are already present
  // locally when the uploads land.
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
        entityID: lastBulk.entityID,
        type: lastBulk.type,
        parent: lastBulk.parent,
      },
      { type: "end" },
    );
  } else if (activeReuse) {
    focusBlock(
      {
        entityID: propsRef.current.entityID,
        type: activeReuse.type,
        parent: propsRef.current.parent,
      },
      { type: "end" },
    );
  }
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
    case "H4":
    case "H5":
    case "H6": {
      headingLevel = 3;
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
          entityID: entityID,
          type: type,
          parent: parent,
        },
        { type: "end" },
      );
    }
  }, 10);
};
