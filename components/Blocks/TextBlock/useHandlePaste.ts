import { MutableRefObject, useCallback } from "react";
import { Fact, ReplicacheMutators, useReplicache } from "src/replicache";
import { EditorView } from "prosemirror-view";
import { setEditorState, useEditorStates } from "src/state/useEditorState";
import { MarkType, DOMParser as ProsemirrorDOMParser } from "prosemirror-model";
import { schema } from "./schema";
import { generateKeyBetween } from "fractional-indexing";
import { addImage } from "src/utils/addImage";
import { BlockProps, focusBlock } from "components/Blocks";
import { useEntitySetContext } from "components/EntitySetProvider";
import { v7 } from "uuid";
import { Replicache } from "replicache";
import { markdownToHtml } from "src/htmlMarkdownParsers";
import { betterIsUrl, isUrl } from "src/utils/isURL";
import { TextSelection } from "prosemirror-state";

const parser = ProsemirrorDOMParser.fromSchema(schema);
export const useHandlePaste = (
  entityID: string,
  propsRef: MutableRefObject<BlockProps>,
  factID?: string,
) => {
  let { rep } = useReplicache();
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
        if (selection.empty) return;
        let tr = view.state.tr;
        let { from, to } = selection;
        tr.addMark(from, to, schema.marks.link.create({ href: text }));

        setEditorState(entityID, {
          editor: view.state.apply(tr),
        });
        return true;
      }
      if (!textHTML && text) {
        textHTML = markdownToHtml(text);
      }
      if (textHTML) {
        let xml = new DOMParser().parseFromString(textHTML, "text/html");
        let currentPosition = propsRef.current.position;
        let children = flattenHTMLToTextBlocks(xml.body);
        if (
          !children.find((c) =>
            ["P", "H1", "H2", "H3", "UL"].includes(c.tagName),
          )
        )
          return;
        children.forEach((child, index) => {
          createBlockFromHTML(child, {
            first: index === 0,
            activeBlockProps: propsRef,
            entity_set,
            rep,
            parent: propsRef.current.listData
              ? propsRef.current.listData.parent
              : propsRef.current.parent,
            getPosition: () => {
              currentPosition = generateKeyBetween(
                currentPosition,
                propsRef.current.nextPosition,
              );
              return currentPosition;
            },
            last: index === children.length - 1,
          });
        });
        return true;
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
              if (factID) rep.mutate.retractFact({ factID: factID });
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
    },
    [rep, entity_set, entityID, propsRef, factID],
  );
};

const createBlockFromHTML = (
  child: Element,
  {
    first,
    last,
    activeBlockProps,
    rep,
    entity_set,
    getPosition,
    parent,
  }: {
    parent: string;
    first: boolean;
    last: boolean;
    activeBlockProps?: MutableRefObject<BlockProps>;
    rep: Replicache<ReplicacheMutators>;
    entity_set: { set: string };
    getPosition: () => string;
  },
) => {
  let content = parser.parse(child);
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
        entity_set,
        getPosition,
        parent,
      });
    }
  }
  switch (child.tagName) {
    case "LI":
    case "SPAN":
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
    default:
      type = null;
  }
  if (!type) return;

  let entityID: string;
  let position: string;
  if (first && type === activeBlockProps?.current.type)
    entityID = activeBlockProps.current.entityID;
  else {
    entityID = v7();
    position = getPosition();
    rep.mutate.addBlock({
      permission_set: entity_set.set,
      factID: v7(),
      newEntityID: entityID,
      parent: parent,
      type: type,
      position,
    });
    if (type === "heading" && headingLevel) {
      rep.mutate.assertFact({
        entity: entityID,
        attribute: "block/heading-level",
        data: { type: "number", value: headingLevel },
      });
    }
  }

  if (child.tagName === "LI") {
    let ul = Array.from(child.children).find((f) => f.tagName === "UL");
    rep.mutate.assertFact({
      entity: entityID,
      attribute: "block/is-list",
      data: { type: "boolean", value: true },
    });
    if (ul) {
      hasChildren = true;
      let currentPosition: string | null = null;
      createBlockFromHTML(ul, {
        first: false,
        last: last,
        activeBlockProps,
        rep,
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
      tr.insert(block.editor.selection.from || 0, content.content);
      let newState = block.editor.apply(tr);
      setEditorState(entityID, {
        editor: newState,
      });
    }
    if (last && !hasChildren) {
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
    if (node.nodeType === Node.ELEMENT_NODE) {
      const elementNode = node as HTMLElement;
      // Collect outer HTML for paragraph-like elements
      if (
        ["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "UL"].includes(
          elementNode.tagName,
        )
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
