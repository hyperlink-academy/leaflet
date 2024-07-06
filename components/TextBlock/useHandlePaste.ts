import { MutableRefObject, useCallback } from "react";
import { Fact, useReplicache } from "src/replicache";
import { EditorView } from "prosemirror-view";
import { setEditorState, useEditorStates } from "src/state/useEditorState";
import { MarkType, DOMParser as ProsemirrorDOMParser } from "prosemirror-model";
import { schema } from "./schema";
import { generateKeyBetween } from "fractional-indexing";
import { addImage } from "src/utils/addImage";
import { BlockProps, focusBlock } from "components/Blocks";
import { useEntitySetContext } from "components/EntitySetProvider";

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
        const parser = ProsemirrorDOMParser.fromSchema(schema);
        let xml = new DOMParser().parseFromString(textHTML, "text/html");
        let currentPosition = propsRef.current.position;
        let children = [...xml.body.children];
        if (!children.find((c) => ["P", "H1", "H2", "H3"].includes(c.tagName)))
          return;
        children.forEach((child, index) => {
          let content = parser.parse(child);
          let type: Fact<"block/type">["data"]["value"] | null;
          let headingLevel: number | null = null;
          switch (child.tagName) {
            case "SPAN": {
              type = "text";
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
            default:
              type = null;
          }
          if (!type) return;

          let entityID: string;
          if (index === 0 && type === propsRef.current.type)
            entityID = propsRef.current.entityID;
          else {
            entityID = crypto.randomUUID();
            currentPosition = generateKeyBetween(
              currentPosition,
              propsRef.current.nextPosition,
            );
            rep.mutate.addBlock({
              permission_set: entity_set.set,
              newEntityID: entityID,
              parent: propsRef.current.parent,
              type: type,
              position: currentPosition,
            });
            if (type === "heading" && headingLevel) {
              rep.mutate.assertFact({
                entity: entityID,
                attribute: "block/heading-level",
                data: { type: "number", value: headingLevel },
              });
            }
          }
          let p = currentPosition;

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
            if (index === children.length - 1) {
              focusBlock(
                {
                  value: entityID,
                  type: type,
                  parent: propsRef.current.parent,
                  position: p,
                },
                { type: "end" },
              );
            }
          }, 10);
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
          let newEntityID = crypto.randomUUID();
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
              entity = crypto.randomUUID();
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
