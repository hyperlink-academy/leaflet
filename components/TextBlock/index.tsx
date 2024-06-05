import { useRef, useEffect, useState } from "react";
import { elementId } from "src/utils/elementId";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { Schema } from "prosemirror-model";
import * as Y from "yjs";
import { ProseMirror, useEditorEffect } from "@nytimes/react-prosemirror";
import * as base64 from "base64-js";
import {
  useReplicache,
  useEntity,
  ReplicacheMutators,
  Fact,
} from "src/replicache";

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { marks, nodes } from "prosemirror-schema-basic";
import { ySyncPlugin } from "y-prosemirror";
import { Replicache } from "replicache";
import { generateKeyBetween } from "fractional-indexing";
import { create } from "zustand";
import { RenderYJSFragment } from "./RenderYJSFragment";
import { useInitialPageLoad } from "components/InitialPageLoadProvider";
import { addImage } from "src/utils/addImage";
import { BlockProps } from "components/Blocks";
import { TextBlockKeymap } from "./keymap";

export const schema = new Schema({
  marks: {
    strong: marks.strong,
    em: marks.em,
  },
  nodes: { doc: nodes.doc, paragraph: nodes.paragraph, text: nodes.text },
});
import { useUIState } from "src/useUIState";

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

export function TextBlock(props: BlockProps) {
  let initialized = useInitialPageLoad();
  return (
    <>
      {!initialized && <RenderedTextBlock entityID={props.entityID} />}
      <div className={`relative ${!initialized ? "hidden" : ""}`}>
        <BaseTextBlock {...props} />
      </div>
    </>
  );
}

function RenderedTextBlock(props: { entityID: string }) {
  let { initialFacts } = useReplicache();
  let initialFact = initialFacts.find(
    (f) => f.entity === props.entityID && f.attribute === "block/text",
  ) as Fact<"block/text"> | undefined;
  if (!initialFact) return <pre className="min-h-6" />;
  let doc = new Y.Doc();
  const update = base64.toByteArray(initialFact.data.value);
  Y.applyUpdate(doc, update);
  return (
    <pre className="w-full whitespace-pre-wrap outline-none min-h-6">
      {doc
        .getXmlElement("prosemirror")
        .toArray()
        .map((node, index) => (
          <RenderYJSFragment key={index} node={node} />
        ))}
    </pre>
  );
}
export function BaseTextBlock(props: BlockProps) {
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
  if (!editorState) return null;

  return (
    <ProseMirror
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
        }}
        onKeyDown={(e) => {}}
        onPaste={async (e) => {
          if (!rep.rep) return;
          for (let item of e.clipboardData.items) {
            if (item?.type.includes("image")) {
              let file = item.getAsFile();
              if (file) {
                let editorState =
                  useEditorStates.getState().editorStates[props.entityID];
                let entity: string;
                if (
                  editorState &&
                  editorState.editor.doc.textContent.length === 0
                ) {
                  entity = props.entityID;
                  await rep.rep.mutate.assertFact({
                    entity: props.entityID,
                    attribute: "block/type",
                    data: { type: "block-type-union", value: "image" },
                  });
                  if (factID)
                    await rep.rep.mutate.retractFact({ factID: factID });
                } else {
                  entity = crypto.randomUUID();
                  await rep.rep.mutate.addBlock({
                    type: "image",
                    newEntityID: entity,
                    parent: props.parent,
                    position: generateKeyBetween(
                      props.position,
                      props.nextPosition,
                    ),
                  });
                }
                await addImage(file, rep.rep, {
                  entityID: entity,
                });
              }
              return;
            }
          }
          e.preventDefault();
          e.stopPropagation();
        }}
        id={elementId.block(props.entityID).text}
        className="w-full whitespace-pre-wrap outline-none"
        ref={setMount}
      />

      {editorState.doc.textContent.length === 0 && selected && (
        <BlockOptions factID={factID} entityID={props.entityID} />
      )}
      <SyncView entityID={props.entityID} />
    </ProseMirror>
  );
}

function BlockOptions(props: { entityID: string; factID: string | undefined }) {
  let { rep } = useReplicache();
  return (
    <div className="absolute top-0 right-0 flex flex-row gap-1">
      <label className="hover:cursor-pointer">
        <div className="bg-[red]">image</div>
        <div className="hidden">
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              let file = e.currentTarget.files?.[0];
              if (!file || !rep) return;
              if (props.factID)
                await rep.mutate.retractFact({ factID: props.factID });
              await rep.mutate.assertFact({
                entity: props.entityID,
                attribute: "block/type",
                data: { type: "block-type-union", value: "image" },
              });
              await addImage(file, rep, { entityID: props.entityID });
            }}
          />
        </div>
      </label>
      <button className="bg-[red]">card</button>
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
