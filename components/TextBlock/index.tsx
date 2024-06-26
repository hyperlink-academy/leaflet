import { useRef, useEffect, useState } from "react";
import { elementId } from "src/utils/elementId";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import * as Y from "yjs";
import {
  ProseMirror,
  useEditorEffect,
  useEditorEventCallback,
} from "@nytimes/react-prosemirror";
import * as base64 from "base64-js";
import {
  useReplicache,
  useEntity,
  ReplicacheMutators,
  Fact,
} from "src/replicache";

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { ySyncPlugin } from "y-prosemirror";
import { Replicache } from "replicache";
import { generateKeyBetween } from "fractional-indexing";
import { create } from "zustand";
import { RenderYJSFragment } from "./RenderYJSFragment";
import { useInitialPageLoad } from "components/InitialPageLoadProvider";
import { addImage } from "src/utils/addImage";
import { BlockProps } from "components/Blocks";
import { TextBlockKeymap } from "./keymap";
import { multiBlockSchema, schema } from "./schema";
import { useUIState } from "src/useUIState";
import { MarkType, DOMParser as ProsemirrorDOMParser } from "prosemirror-model";
import { useAppEventListener } from "src/eventBus";
import { addLinkBlock } from "src/utils/addLinkBlock";
import { BlockOptions } from "components/BlockOptions";

export let useEditorStates = create(() => ({
  lastXPosition: 0,
  editorStates: {} as {
    [entity: string]:
      | {
          editor: InstanceType<typeof EditorState>;
          view?: InstanceType<typeof EditorView>;
        }
      | undefined;
  },
}));

export const setEditorState = (
  entityID: string,
  s: {
    editor: InstanceType<typeof EditorState>;
  },
) => {
  useEditorStates.setState((oldState) => {
    let existingState = oldState.editorStates[entityID];
    return {
      editorStates: {
        ...oldState.editorStates,
        [entityID]: { ...existingState, ...s },
      },
    };
  });
};

export function TextBlock(props: BlockProps & { className: string }) {
  let initialized = useInitialPageLoad();
  return (
    <>
      {!initialized && (
        <RenderedTextBlock
          entityID={props.entityID}
          className={props.className}
        />
      )}
      <div className={`relative group/text ${!initialized ? "hidden" : ""}`}>
        <BaseTextBlock {...props} />
      </div>
    </>
  );
}

export function RenderedTextBlock(props: {
  entityID: string;
  className?: string;
  placeholder?: string;
}) {
  let initialFact = useEntity(props.entityID, "block/text");
  if (!initialFact) return <pre className="min-h-6" />;
  let doc = new Y.Doc();
  const update = base64.toByteArray(initialFact.data.value);
  Y.applyUpdate(doc, update);
  let nodes = doc.getXmlElement("prosemirror").toArray();

  return (
    <pre
      className={`w-full whitespace-pre-wrap outline-none min-h-6 ${props.className}`}
    >
      {nodes.map((node, index) => (
        <RenderYJSFragment key={index} node={node} />
      ))}
    </pre>
  );
}
export function BaseTextBlock(props: BlockProps & { className: string }) {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  let selected = useUIState((s) =>
    s.selectedBlock.find((b) => b.value === props.entityID),
  );
  let [value, factID] = useYJSValue(props.entityID);
  let repRef = useRef<null | Replicache<ReplicacheMutators>>(null);
  let propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  }, [props]);
  let rep = useReplicache();
  useEffect(() => {
    repRef.current = rep.rep;
  }, [rep?.rep]);

  let editorState = useEditorStates(
    (s) => s.editorStates[props.entityID],
  )?.editor;
  useEffect(() => {
    if (!editorState)
      setEditorState(props.entityID, {
        editor: EditorState.create({
          schema,
          plugins: [
            ySyncPlugin(value),
            TextBlockKeymap(propsRef, repRef),
            keymap(baseKeymap),
          ],
        }),
      });
  }, [editorState, props.entityID, props.parent, value]);
  useEffect(() => {
    return () => {
      useEditorStates.setState((s) => ({
        ...s,
        editorStates: { ...s.editorStates, [props.entityID]: undefined },
      }));
    };
  }, [props.entityID]);
  if (!editorState) return null;

  return (
    <ProseMirror
      handleClickOn={(view, _pos, node, _nodePos) => {
        if (node.nodeSize < _pos) return;
        let mark = node
          .resolve(_pos)
          .marks()
          .find((f) => f.type === schema.marks.link);
        if (mark) {
          window.open(mark.attrs.href, "_blank");
        }
      }}
      handlePaste={(view, e) => {
        if (!rep.rep) return;
        if (!e.clipboardData) return;
        let textHTML = e.clipboardData.getData("text/html");
        let editorState =
          useEditorStates.getState().editorStates[props.entityID];
        if (!editorState) return;
        if (textHTML) {
          const parser = ProsemirrorDOMParser.fromSchema(schema);
          let xml = new DOMParser().parseFromString(textHTML, "text/html");
          let currentPosition = propsRef.current.position;
          let children = [...xml.body.children];
          if (
            !children.find((c) => ["P", "H1", "H2", "H3"].includes(c.tagName))
          )
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
            console.log(child);
            if (!type) return;

            let entityID: string;
            console.log(index, type, props.type);
            if (index === 0 && type === props.type) entityID = props.entityID;
            else {
              entityID = crypto.randomUUID();
              currentPosition = generateKeyBetween(
                currentPosition,
                propsRef.current.nextPosition,
              );
              repRef.current?.mutate.addBlock({
                newEntityID: entityID,
                parent: propsRef.current.parent,
                type: type,
                position: currentPosition,
              });
              if (type === "heading" && headingLevel) {
                repRef.current?.mutate.assertFact({
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
                console.log(content.content);
                tr.insert(block.editor.selection.from || 0, content.content);
                let newState = block.editor.apply(tr);
                setEditorState(entityID, {
                  editor: newState,
                });
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
            repRef.current?.mutate.addBlock({
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
                entity = props.entityID;
                rep.rep.mutate.assertFact({
                  entity: props.entityID,
                  attribute: "block/type",
                  data: { type: "block-type-union", value: "image" },
                });
                if (factID) rep.rep.mutate.retractFact({ factID: factID });
              } else {
                entity = crypto.randomUUID();
                rep.rep.mutate.addBlock({
                  type: "image",
                  newEntityID: entity,
                  parent: props.parent,
                  position: generateKeyBetween(
                    props.position,
                    props.nextPosition,
                  ),
                });
              }
              addImage(file, rep.rep, {
                attribute: "block/image",
                entityID: entity,
              });
            }
            return;
          }
        }

        e.preventDefault();
        e.stopPropagation();
      }}
      mount={mount}
      state={editorState}
      dispatchTransaction={(tr) => {
        useEditorStates.setState((s) => {
          let existingState = s.editorStates[props.entityID];
          if (!existingState) return s;
          return {
            editorStates: {
              ...s.editorStates,
              [props.entityID]: {
                ...existingState,
                editor: existingState.editor.apply(tr),
              },
            },
          };
        });
      }}
    >
      <pre
        onBlur={async () => {
          if (editorState.doc.textContent.startsWith("http")) {
            await addLinkBlock(
              editorState.doc.textContent,
              props.entityID,
              rep.rep,
            );
          }
        }}
        onFocus={() => {
          useUIState.getState().setSelectedBlock(props);
          useUIState.setState(() => ({
            focusedBlock: {
              type: "block",
              entityID: props.entityID,
              parent: props.parent,
            },
          }));
        }}
        onSelect={() => {
          useUIState.setState((s) => ({
            ...s,
            focusedTextBlock: props.entityID,
          }));
        }}
        id={elementId.block(props.entityID).text}
        className={`textBlock w-full p-0 border-none outline-none resize-none align-top bg-transparent whitespace-pre-wrap ${props.className}`}
        ref={setMount}
      />

      {editorState.doc.textContent.length === 0 && props.position === "a0" && (
        <div className="pointer-events-none absolute top-0 left-0 italic text-tertiary">
          write something...
        </div>
      )}
      {editorState.doc.textContent.length === 0 && selected && (
        <BlockOptions
          factID={factID}
          entityID={props.entityID}
          parent={props.parent}
          position={props.position}
          nextPosition={props.nextPosition}
        />
      )}
      <SyncView entityID={props.entityID} />
      <CommandHandler entityID={props.entityID} />
    </ProseMirror>
  );
}

function CommandHandler(props: { entityID: string }) {
  let cb = useEditorEventCallback((view, args: { mark: MarkType }) => {
    toggleMark(args.mark)(view.state, view.dispatch);
  });
  useAppEventListener(props.entityID, "toggleMark", cb, []);
  return null;
}

let SyncView = (props: { entityID: string }) => {
  useEditorEffect((view) => {
    if (!view.hasFocus()) return;
    const coords = view.coordsAtPos(view.state.selection.anchor);
    useEditorStates.setState({ lastXPosition: coords.left });
  });
  useEditorEffect(
    (view) => {
      useEditorStates.setState((s) => {
        let existingEditor = s.editorStates[props.entityID];
        if (!existingEditor) return s;
        return {
          editorStates: {
            ...s.editorStates,
            [props.entityID]: { ...existingEditor, view },
          },
        };
      });
    },
    [props.entityID],
  );
  return null;
};

//I need to get *and* set the value to zustand?
// This will mean that the value is undefined for a second... Maybe I could use a ref to figure that out?
function useYJSValue(entityID: string) {
  const [ydoc] = useState(new Y.Doc());
  const docStateFromReplicache = useEntity(entityID, "block/text");
  let rep = useReplicache();
  const yText = ydoc.getXmlFragment("prosemirror");

  if (docStateFromReplicache) {
    const update = base64.toByteArray(docStateFromReplicache.data.value);
    Y.applyUpdate(ydoc, update);
  }

  useEffect(() => {
    if (!rep.rep) return;
    const f = async () => {
      const update = Y.encodeStateAsUpdate(ydoc);
      await rep.rep?.mutate.assertFact({
        entity: entityID,
        attribute: "block/text",
        data: {
          value: base64.fromByteArray(update),
          type: "text",
        },
      });
    };
    yText.observeDeep(f);
    return () => {
      yText.unobserveDeep(f);
    };
  }, [yText, entityID, rep, ydoc]);
  return [yText, docStateFromReplicache?.id] as const;
}
