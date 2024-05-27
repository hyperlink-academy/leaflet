import { useRef, useEffect, useState } from "react";
import { elementId } from "../utils/elementId";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { Schema } from "prosemirror-model";
import * as Y from "yjs";
import { ProseMirror, useEditorState } from "@nytimes/react-prosemirror";
import * as base64 from "base64-js";
import {
  useReplicache,
  useEntity,
  ReplicacheMutators,
  Fact,
} from "../replicache";

let schema = new Schema({
  marks: {
    strong: marks.strong,
    em: marks.em,
  },
  nodes: { doc: nodes.doc, paragraph: nodes.paragraph, text: nodes.text },
});

import { EditorState, TextSelection } from "prosemirror-state";
import { marks, nodes } from "prosemirror-schema-basic";
import { ySyncPlugin } from "y-prosemirror";
import { Replicache } from "replicache";
import { generateKeyBetween } from "fractional-indexing";
import { create } from "zustand";
import { RenderYJSFragment } from "./RenderYJSFragment";
import { useInitialPageLoad } from "./InitialPageLoadProvider";
import { addImage } from "../utils/addImage";

let useEditorStates = create(
  () =>
    ({}) as {
      [entity: string]:
        | { editor: InstanceType<typeof EditorState> }
        | undefined;
    },
);

export function TextBlock(props: {
  entityID: string;
  parent: string;
  position: string;
  previousBlock: { value: string; position: string } | null;
  nextPosition: string | null;
}) {
  let initialized = useInitialPageLoad();
  return (
    <>
      {!initialized && <RenderedTextBlock entityID={props.entityID} />}
      <div className={`${!initialized ? "hidden" : ""}`}>
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
export function BaseTextBlock(props: {
  entityID: string;
  parent: string;
  position: string;
  previousBlock: { value: string; position: string } | null;
  nextPosition: string | null;
}) {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  let value = useYJSValue(props.entityID);
  let repRef = useRef<null | Replicache<ReplicacheMutators>>(null);
  let propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  }, [props]);
  let rep = useReplicache();
  useEffect(() => {
    repRef.current = rep.rep;
  }, [rep?.rep]);

  let editorState = useEditorStates((s) => s[props.entityID])?.editor;
  useEffect(() => {
    if (!editorState)
      useEditorStates.setState((s) => ({
        ...s,
        [props.entityID]: {
          editor: EditorState.create({
            schema,
            plugins: [
              ySyncPlugin(value),
              keymap({
                "Meta-b": toggleMark(schema.marks.strong),
                "Meta-i": toggleMark(schema.marks.em),
                Backspace: (state) => {
                  if (state.doc.textContent.length === 0) {
                    repRef.current?.mutate.removeBlock({
                      blockEntity: props.entityID,
                    });
                    if (propsRef.current.previousBlock) {
                      let prevBlock = propsRef.current.previousBlock.value;
                      document
                        .getElementById(elementId.block(prevBlock).text)
                        ?.focus();
                      let previousBlockEditor =
                        useEditorStates.getState()[prevBlock]?.editor;
                      if (previousBlockEditor) {
                        let tr = previousBlockEditor.tr;
                        let endPos = tr.doc.content.size;

                        let newState = previousBlockEditor.apply(
                          tr.setSelection(
                            TextSelection.create(
                              tr.doc,
                              endPos - 1,
                              endPos - 1,
                            ),
                          ),
                        );
                        useEditorStates.setState((s) => ({
                          ...s,
                          [prevBlock]: { editor: newState },
                        }));
                      }
                    }
                  }
                  return false;
                },
                "Shift-Enter": () => {
                  let newEntityID = crypto.randomUUID();
                  repRef.current?.mutate.addBlock({
                    newEntityID,
                    parent: props.parent,
                    position: generateKeyBetween(
                      propsRef.current.position,
                      propsRef.current.nextPosition,
                    ),
                  });
                  setTimeout(() => {
                    document
                      .getElementById(elementId.block(newEntityID).text)
                      ?.focus();
                  }, 10);
                  return true;
                },
              }),
              keymap(baseKeymap),
            ],
          }),
        },
      }));
  }, [editorState, props.entityID, props.parent, value]);
  if (!editorState) return null;

  return (
    <ProseMirror
      mount={mount}
      state={editorState}
      dispatchTransaction={(tr) => {
        useEditorStates.setState((s) => {
          let existingState = s[props.entityID]?.editor;
          if (!existingState) return s;
          return {
            ...s,
            [props.entityID]: { editor: existingState.apply(tr) },
          };
        });
      }}
    >
      <pre
        onPaste={(e) => {
          if (!rep.rep) return;
          for (let item of e.clipboardData.items) {
            if (item?.type.includes("image")) {
              let file = item.getAsFile();
              if (file)
                addImage(file, rep.rep, {
                  parent: props.parent,
                  position: generateKeyBetween(
                    props.position,
                    props.nextPosition,
                  ),
                });
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
    </ProseMirror>
  );
}

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
  return yText;
}
