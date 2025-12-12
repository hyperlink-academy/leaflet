import { MutableRefObject, useCallback } from "react";
import { Fact, ReplicacheMutators, useReplicache } from "src/replicache";
import { EditorView } from "prosemirror-view";
import { setEditorState, useEditorStates } from "src/state/useEditorState";
import { MarkType, DOMParser as ProsemirrorDOMParser } from "prosemirror-model";
import { multiBlockSchema, schema } from "./schema";
import { generateKeyBetween } from "fractional-indexing";
import { addImage } from "src/utils/addImage";
import { BlockProps } from "../Block";
import { focusBlock } from "src/utils/focusBlock";
import { useEntitySetContext } from "components/EntitySetProvider";
import { v7 } from "uuid";
import { Replicache } from "replicache";
import { markdownToHtml } from "src/htmlMarkdownParsers";
import { betterIsUrl, isUrl } from "src/utils/isURL";
import { TextSelection } from "prosemirror-state";
import type { ImageAttribute } from "src/replicache/attributes";
import { addLinkBlock } from "src/utils/addLinkBlock";
import { UndoManager } from "src/undoManager";

const parser = ProsemirrorDOMParser.fromSchema(schema);
const multilineParser = ProsemirrorDOMParser.fromSchema(multiBlockSchema);
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
      //
      let xml = new DOMParser().parseFromString(textHTML, "text/html");
      if ((!textHTML || !xml.children.length) && text) {
        textHTML = markdownToHtml(text);
      }
      // if thre is html
      if (textHTML) {
        let xml = new DOMParser().parseFromString(textHTML, "text/html");
        let currentPosition = propsRef.current.position;
        let children = flattenHTMLToTextBlocks(xml.body);
        let hasImage = false;
        for (let item of e.clipboardData.items) {
          if (item.type.includes("image")) hasImage = true;
        }
        if (
          !(children.length === 1 && children[0].tagName === "IMG" && hasImage)
        ) {
          children.forEach((child, index) => {
            createBlockFromHTML(child, {
              undoManager,
              parentType: propsRef.current.pageType,
              first: index === 0,
              activeBlockProps: propsRef,
              entity_set,
              rep,
              parent: propsRef.current.listData
                ? propsRef.current.listData.parent
                : propsRef.current.parent,
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

      for (let item of e.clipboardData.items) {
        if (item?.type.includes("image")) {
          let file = item.getAsFile();
          if (file) {
            let entity: string;
            if (editorState.editor.doc.textContent.length === 0) {
              entity = propsRef.current.entityID;
              rep.mutate.assertFact({
                entity: propsRef.current.entityID,
                attribute: "block/type",
                data: { type: "block-type-union", value: "image" },
              });
              rep.mutate.retractAttribute({
                entity: propsRef.current.entityID,
                attribute: "block/text",
              });
            } else {
              entity = v7();
              rep.mutate.addBlock({
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
            addImage(file, rep, {
              attribute: "block/image",
              entityID: entity,
            });
          }
          return;
        }
      }
      e.preventDefault();
      e.stopPropagation();
      return true;
    },
    [rep, entity_set, entityID, propsRef],
  );
};

const createBlockFromHTML = (
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
  },
) => {
  let type: Fact<"block/type">["data"]["value"] | null;
  let headingLevel: number | null = null;
  let hasChildren = false;

  if (child.tagName === "UL") {
    let children = Array.from(child.children);
    if (children.length > 0) hasChildren = true;
    for (let c of children) {
      createBlockFromHTML(c, {
        first: first && c === children[0],
        last: last && c === children[children.length - 1],
        activeBlockProps,
        rep,
        undoManager,
        entity_set,
        getPosition,
        parent,
        parentType,
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
    case "DIV": {
      type = "card";
      break;
    }
    case "IMG": {
      type = "image";
      break;
    }
    case "A": {
      type = "link";
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
  if (child.tagName === "A") {
    let href = child.getAttribute("href");
    let dataType = child.getAttribute("data-type");
    if (href) {
      if (dataType === "button") {
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
      } else {
        addLinkBlock(href, entityID, rep);
      }
    }
  }
  if (child.tagName === "PRE") {
    let lang = child.getAttribute("data-language") || "plaintext";
    if (child.firstElementChild && child.firstElementChild.className) {
      let className = child.firstElementChild.className;
      let match = className.match(/language-(\w+)/);
      if (match) {
        lang = match[1];
      }
    }
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
          data: { type: "string", value: child.textContent },
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
        });
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
        data: { type: "string", value: tex || "" },
      },
    ]);
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
      // Optimized: Use pre-computed ImageAttribute instead of FilterAttributes
      let images: Pick<
        Fact<ImageAttribute>,
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
          });
      }
    }
  }

  if (child.tagName === "LI") {
    let ul = Array.from(child.children)
      .flatMap((f) => flattenHTMLToTextBlocks(f as HTMLElement))
      .find((f) => f.tagName === "UL");
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
    if (ul) {
      hasChildren = true;
      let currentPosition: string | null = null;
      createBlockFromHTML(ul, {
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

function flattenHTMLToTextBlocks(element: HTMLElement): HTMLElement[] {
  // Function to recursively collect HTML from nodes
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
      // Collect outer HTML for paragraph-like elements
      if (
        [
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
          "IMG",
          "A",
          "SPAN",
          "HR",
        ].includes(elementNode.tagName) ||
        elementNode.getAttribute("data-entityid") ||
        elementNode.getAttribute("data-tex")
      ) {
        htmlBlocks.push(elementNode);
      } else {
        // Recursively collect HTML from child nodes
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
