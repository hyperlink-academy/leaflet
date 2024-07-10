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
      let editorState = useEditorStates.getState().editorStates[entityID];
      if (!editorState) return;
      if (textHTML) {
        let xml = new DOMParser().parseFromString(textHTML, "text/html");
        let currentPosition = propsRef.current.position;
        let children = flattenHTMLToTextBlocks(xml.body);
        if (!children.find((c) => ["P", "H1", "H2", "H3"].includes(c.tagName)))
          return;
        if (children.length === 1) return false;
        children.forEach((child, index) => {
          createBlockFromHTML(
            child,
            index,
            propsRef,
            rep,
            entity_set,
            () => {
              currentPosition = generateKeyBetween(
                currentPosition,
                propsRef.current.nextPosition,
              );
              return currentPosition;
            },
            index === children.length - 1,
          );
        });
        return true;
      } else {
        let text = e.clipboardData.getData("text");
        let paragraphs = text
          .split("\n")
          .slice(1)
          .filter((f) => !!f);
        let currentPosition = propsRef.current.position;
        for (let p of paragraphs) {
          let newEntityID = v7();
          currentPosition = generateKeyBetween(
            currentPosition,
            propsRef.current.nextPosition,
          );
          rep.mutate.addBlock({
            permission_set: entity_set.set,
            newEntityID,
            parent: propsRef.current.parent,
            type: "text",
            position: currentPosition,
          });
          setTimeout(() => {
            let block = useEditorStates.getState().editorStates[newEntityID];
            if (block) {
              let tr = block.editor.tr;
              tr.insertText(p, 1);
              let newState = block.editor.apply(tr);
              setEditorState(newEntityID, {
                editor: newState,
              });
            }
          }, 10);
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
              if (factID) rep.mutate.retractFact({ factID: factID });
            } else {
              entity = v7();
              rep.mutate.addBlock({
                permission_set: entity_set.set,
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
  index: number,
  propsRef: MutableRefObject<BlockProps>,
  rep: Replicache<ReplicacheMutators>,
  entity_set: { set: string },
  getPosition: () => string,
  last: boolean,
) => {
  let content = parser.parse(child);
  let type: Fact<"block/type">["data"]["value"] | null;
  let headingLevel: number | null = null;
  switch (child.tagName) {
    case "UL":
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
  if (index === 0 && type === propsRef.current.type)
    entityID = propsRef.current.entityID;
  else {
    entityID = v7();
    position = getPosition();
    rep.mutate.addBlock({
      permission_set: entity_set.set,
      newEntityID: entityID,
      parent: propsRef.current.parent,
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
    if (last) {
      focusBlock(
        {
          value: entityID,
          type: type,
          parent: propsRef.current.parent,
          position: position,
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
        ["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI"].includes(
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
