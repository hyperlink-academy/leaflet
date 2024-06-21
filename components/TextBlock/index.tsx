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
import { BlockCardSmall, BlockImageSmall } from "components/Icons";
import { useAppEventListener } from "src/eventBus";

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
}) {
  let initialFact = useEntity(props.entityID, "block/text");
  if (!initialFact) return <pre className="min-h-6" />;
  let doc = new Y.Doc();
  const update = base64.toByteArray(initialFact.data.value);
  Y.applyUpdate(doc, update);
  return (
    <pre
      className={`w-full whitespace-pre-wrap outline-none min-h-6 ${props.className}`}
    >
      {doc
        .getXmlElement("prosemirror")
        .toArray()
        .map((node, index) => (
          <RenderYJSFragment key={index} node={node} />
        ))}
    </pre>
  );
}
export function BaseTextBlock(props: BlockProps & { className: string }) {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  let selected = useUIState((s) => s.selectedBlock.includes(props.entityID));
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
  }, []);
  if (!editorState) return null;

  return (
    <ProseMirror
      handlePaste={(view, e) => {
        if (!rep.rep) return;
        if (!e.clipboardData) return;
        let text = e.clipboardData.getData("text/html");
        let editorState =
          useEditorStates.getState().editorStates[props.entityID];
        if (!editorState) return;
        const parser = ProsemirrorDOMParser.fromSchema(multiBlockSchema);
        let xml = new DOMParser().parseFromString(text, "text/html");
        let nodes = parser.parse(xml);
        let currentPosition = propsRef.current.position;
        nodes.content.forEach((node, _, index) => {
          if (index === 0) return;
          let newEntityID = crypto.randomUUID();
          currentPosition = generateKeyBetween(
            propsRef.current.position,
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
              let newNode = schema.nodeFromJSON(node.toJSON());
              tr.replaceWith(0, tr.doc.content.size, newNode.content);
              let newState = block.editor.apply(tr);
              setEditorState(newEntityID, {
                editor: newState,
              });
            }
          }, 10);
        });

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
        onFocus={() => {
          useUIState.getState().setSelectedBlock(props.entityID);
          useUIState.setState((s) => ({
            ...s,
            focusedTextBlock: props.entityID,
          }));
        }}
        onSelect={() => {
          useUIState.setState((s) => ({
            ...s,
            focusedTextBlock: props.entityID,
          }));
        }}
        onPaste={async (e) => {}}
        id={elementId.block(props.entityID).text}
        className={`textBlock w-full p-0 border-none outline-none resize-none align-top bg-transparent whitespace-pre-wrap ${props.className}`}
        ref={setMount}
      />

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

export function BlockOptions(props: {
  parent: string;
  entityID: string | null;
  position: string | null;
  nextPosition: string | null;
  factID?: string | undefined;
}) {
  let { rep } = useReplicache();
  return (
    <div className="absolute top-0 right-0 hidden group-hover/text:block group-focus-within/text:block">
      <div className="flex gap-1 items-center">
        <label className="hover:cursor-pointer flex place-items-center">
          <div className="text-tertiary hover:text-accent ">
            <BlockImageSmall />
          </div>
          <div className="hidden">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                let file = e.currentTarget.files?.[0];
                if (!file || !rep) return;
                if (props.factID)
                  await rep.mutate.retractFact({ factID: props.factID });
                let entity = props.entityID;
                if (!entity) {
                  entity = crypto.randomUUID();
                  await rep?.mutate.addBlock({
                    parent: props.parent,
                    type: "text",
                    position: generateKeyBetween(
                      props.position,
                      props.nextPosition,
                    ),
                    newEntityID: entity,
                  });
                }
                await rep.mutate.assertFact({
                  entity,
                  attribute: "block/type",
                  data: { type: "block-type-union", value: "image" },
                });
                await addImage(file, rep, {
                  entityID: entity,
                  attribute: "block/image",
                });
              }}
            />
          </div>
        </label>
        <button
          className="text-tertiary hover:text-accent"
          onClick={async () => {
            if (!props.entityID) {
              let entity = crypto.randomUUID();
              await rep?.mutate.addBlock({
                parent: props.parent,
                type: "card",
                position: generateKeyBetween(
                  props.position,
                  props.nextPosition,
                ),
                newEntityID: entity,
              });
            } else {
              await rep?.mutate.assertFact({
                entity: props.entityID,
                attribute: "block/type",
                data: { type: "block-type-union", value: "card" },
              });
            }
          }}
        >
          <BlockCardSmall />
        </button>
      </div>
    </div>
  );
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
