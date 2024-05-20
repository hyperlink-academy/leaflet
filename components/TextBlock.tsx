import { useRef, useEffect, useState } from "react";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { useReplicache, useEntity } from "../replicache";

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { schema } from "prosemirror-schema-basic";
import { ySyncPlugin } from "y-prosemirror";

export function TextBlock(props: { entityID: string }) {
  let ref = useRef<null | HTMLPreElement>(null);
  let value = useYJSValue(props.entityID);
  useEffect(() => {
    let editor = new EditorView(ref.current, {
      state: EditorState.create({
        schema,
        plugins: [ySyncPlugin(value)],
      }),
    });
    return () => {
      editor.destroy();
    };
  }, [value]);

  return <pre ref={ref} />;
}

function useYJSValue(entityID: string) {
  const [ydoc] = useState(new Y.Doc());
  const docStateFromReplicache = useEntity(entityID, "block/text");
  let rep = useReplicache();
  const yText = ydoc.getXmlFragment("prosemirror");

  if (docStateFromReplicache?.[0]) {
    const update = base64.toByteArray(docStateFromReplicache[0].data.value);
    Y.applyUpdateV2(ydoc, update);
  }

  useEffect(() => {
    if (!rep.rep) return;
    console.log("yo");
    const f = async () => {
      console.log(entityID);
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
