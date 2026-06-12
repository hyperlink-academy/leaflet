import { useState, useEffect, useMemo } from "react";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import * as base64 from "base64-js";
import { useEntity, useReplicache } from "src/replicache";
import { useYjsRealtime, YjsRealtimeConnection } from "src/yjsRealtime";
import { useIdentityData } from "components/IdentityProvider";
import { remoteCursorPlugin } from "./remoteCursorPlugin";
import { RemoteCursors } from "./RemoteCursors";

// Everything a collaboratively-edited text entity needs for live multiplayer,
// in one place so the three moving parts can't drift apart between the text
// block and footnote call sites:
//   - the yjs value to bind ySyncPlugin to (`yText`),
//   - the ProseMirror plugin that publishes the local selection to awareness
//     and decorates remote selections (`cursorPlugin`), and
//   - the overlay that draws remote carets outside the contenteditable
//     (`overlay`).
// The plugin is memoized on the (stable) awareness so it's built once, and the
// overlay element carries the same awareness, so a caller only has to drop
// `cursorPlugin` into its plugin list and render `overlay`.
export function useCollabCursors(entityID: string) {
  let { yText, awareness } = useYJSValue(entityID);
  let cursorPlugin = useMemo(() => remoteCursorPlugin(awareness), [awareness]);
  let overlay = <RemoteCursors entityID={entityID} awareness={awareness} />;
  return { yText, awareness, cursorPlugin, overlay };
}

export function useYJSValue(entityID: string) {
  const [ydoc] = useState(() => new Y.Doc());
  const docStateFromReplicache = useEntity(entityID, "block/text");
  let rep = useReplicache();
  let realtime = useYjsRealtime();
  let { identity } = useIdentityData();
  const [yText] = useState(() => ydoc.getXmlFragment("prosemirror"));
  const [awareness] = useState(() => new Awareness(ydoc));

  if (docStateFromReplicache) {
    const update = base64.toByteArray(docStateFromReplicache.data.value);
    Y.applyUpdate(ydoc, update);
  }

  let userName =
    identity?.bsky_profiles?.record?.displayName ||
    identity?.bsky_profiles?.handle ||
    "Anonymous";
  useEffect(() => {
    // a stable hue offset per client; each peer derives the actual cursor
    // color from their own theme's accent (see collabCursor.ts)
    awareness.setLocalStateField("user", {
      name: userName,
      hue: (ydoc.clientID % 8) * 45,
    });
  }, [awareness, userName, ydoc]);

  // Broadcast local edits and cursor positions to connected peers, and apply
  // theirs as they arrive. Cursors only ever travel over the channel; doc
  // updates also flow through replicache below.
  useEffect(() => {
    if (!realtime) return;
    return realtime.register(entityID, ydoc, awareness);
  }, [realtime, entityID, ydoc, awareness]);

  useEffect(() => {
    return () => {
      awareness.destroy();
    };
  }, [awareness]);

  useEffect(() => {
    if (!rep.rep) return;
    let timeout = null as null | number;
    const updateReplicache = async () => {
      const update = Y.encodeStateAsUpdate(ydoc);
      await rep.rep?.mutate.assertFact({
        //These undos are handled above in the Prosemirror context
        ignoreUndo: true,
        entity: entityID,
        attribute: "block/text",
        data: {
          value: base64.fromByteArray(update),
          type: "text",
        },
      });
    };
    const f = async (events: Y.YEvent<any>[], transaction: Y.Transaction) => {
      // Transactions with no origin come from replicache itself, and ones
      // originating from the realtime channel are persisted by the peer that
      // authored them — only local edits should be written back.
      if (!transaction.origin) return;
      if (transaction.origin instanceof YjsRealtimeConnection) return;
      if (timeout) clearTimeout(timeout);
      timeout = window.setTimeout(async () => {
        updateReplicache();
      }, 300);
    };

    yText.observeDeep(f);
    return () => {
      yText.unobserveDeep(f);
    };
  }, [yText, entityID, rep, ydoc]);
  return { yText, awareness };
}
