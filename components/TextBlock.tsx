import { useRef, useEffect, useState } from "react";
import { elementId } from "../utils/elementId";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import * as Y from "yjs";
import { ProseMirror } from "@nytimes/react-prosemirror";
import * as base64 from "base64-js";
import { useReplicache, useEntity, ReplicacheMutators } from "../replicache";

import { EditorState } from "prosemirror-state";
import { schema } from "prosemirror-schema-basic";
import { ySyncPlugin } from "y-prosemirror";
import { Replicache } from "replicache";
import { generateKeyBetween } from "fractional-indexing";

export function TextBlock(props: {
  entityID: string;
  parent: string;
  position: string;
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
  let [editorState, setEditorState] = useState(
    EditorState.create({
      schema,
      plugins: [
        ySyncPlugin(value),
        keymap({
          "Meta-b": toggleMark(schema.marks.strong),
          "Meta-i": toggleMark(schema.marks.em),
          Enter: () => {
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
            }, 100);
            return true;
          },
        }),
        keymap(baseKeymap),
      ],
    }),
  );

  return (
    <ProseMirror
      mount={mount}
      state={editorState}
      dispatchTransaction={(tr) => {
        setEditorState((s) => s.apply(tr));
      }}
    >
      <pre
        id={elementId.block(props.entityID).text}
        className="w-full whitespace-pre-wrap"
        ref={setMount}
      />
    </ProseMirror>
  );
}

function useYJSValue(entityID: string) {
  const [ydoc] = useState(new Y.Doc());
  const docStateFromReplicache = useEntity(entityID, "block/text");
  console.log(docStateFromReplicache?.data.value);
  let rep = useReplicache();
  const yText = ydoc.getXmlFragment("prosemirror");

  if (docStateFromReplicache) {
    const update = base64.toByteArray(docStateFromReplicache.data.value);
    Y.applyUpdateV2(ydoc, update);
  }

  useEffect(() => {
    if (!rep.rep) return;
    const f = async () => {
      const update = Y.encodeStateAsUpdateV2(ydoc);
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
