"use client";

import { createContext, useContext, useEffect, useState } from "react";
import * as Y from "yjs";
import * as base64 from "base64-js";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseBrowserClient } from "supabase/browserClient";
import { SCHEMA_VERSION } from "components/Blocks/TextBlock/schema";
import { markClientStale } from "components/Blocks/TextBlock/schemaVersion";

// Live multiplayer layer for text blocks. Each client broadcasts incremental
// yjs document updates and cursor (awareness) state over a supabase realtime
// channel scoped to the leaflet. Document updates are also persisted through
// replicache, which stays the source of truth; because yjs updates are CRDTs,
// applying the same change from both the channel and a replicache pull
// converges. Awareness state is ephemeral and only ever travels over the
// channel — never through replicache.

const DOC_FLUSH_INTERVAL = 50;
const AWARENESS_FLUSH_INTERVAL = 80;

type DocEntry = { entityID: string; doc: Y.Doc; awareness: Awareness };

export class YjsRealtimeConnection {
  private channel: RealtimeChannel | null = null;
  private connected = false;
  private closed = false;
  // The same entityID can be mounted by more than one editor at once (e.g. a
  // footnote rendered in both the side column and the bottom section), each
  // with its own doc/awareness, so an entity maps to a set of registrations.
  private docs = new Map<string, Set<DocEntry>>();
  private pendingDocUpdates = new Map<string, Uint8Array[]>();
  // Keyed by awareness rather than entityID: two editors sharing an entityID
  // have distinct awareness instances (distinct clientIDs), and
  // encodeAwarenessUpdate can only encode clients its own awareness knows.
  private pendingAwareness = new Map<
    Awareness,
    { entityID: string; clients: Set<number> }
  >();
  private docFlushTimeout: number | null = null;
  private awarenessFlushTimeout: number | null = null;

  constructor(private name: string) {}

  // The channel is only opened once an editor registers a doc, so replicache
  // providers without any mounted editors don't open extra sockets. This is a
  // separate topic from the `rootEntity:` poke channel — joining the same
  // phoenix topic twice closes the first subscription.
  private ensureChannel() {
    if (this.channel || this.closed) return;
    let supabase = supabaseBrowserClient();
    this.channel = supabase.channel(`yjs:${this.name}`);
    this.channel.on("broadcast", { event: "doc-update" }, ({ payload }) =>
      this.onDocBroadcast(payload),
    );
    this.channel.on("broadcast", { event: "awareness" }, ({ payload }) =>
      this.onAwarenessBroadcast(payload),
    );
    // A peer that just joined asks everyone to (re)announce their cursors.
    this.channel.on("broadcast", { event: "hello" }, () =>
      this.announceAwareness(),
    );
    this.channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        this.connected = true;
        this.send("hello", {});
        this.announceAwareness();
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        this.connected = false;
      }
    });
  }

  register(entityID: string, doc: Y.Doc, awareness: Awareness) {
    this.ensureChannel();
    const entry: DocEntry = { entityID, doc, awareness };
    let set = this.docs.get(entityID);
    if (!set) this.docs.set(entityID, (set = new Set()));
    set.add(entry);

    const onDocUpdate = (update: Uint8Array, origin: unknown) => {
      // Updates applied from replicache have no origin and updates received
      // over the channel have this connection as their origin; only local
      // edits (whose origin is the prosemirror binding) are broadcast.
      if (!origin || origin === this) return;
      this.queueDocUpdate(entityID, update);
    };

    // Awareness emits 'update' for the periodic keep-alive renewal of the
    // local state as well as for real changes ('change' only fires for the
    // latter). Relay keep-alives only while our cursor is placed in this
    // block — peers render nothing for a cursor-less state, so letting it
    // expire remotely is fine and saves a broadcast per block every 15s.
    let stateChanged = false;
    const onAwarenessChange = () => {
      stateChanged = true;
    };
    const onAwarenessUpdate = (
      {
        added,
        updated,
        removed,
      }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown,
    ) => {
      const wasChange = stateChanged;
      stateChanged = false;
      if (origin === this) return;
      if (!wasChange && !awareness.getLocalState()?.cursor) return;
      this.queueAwareness(entityID, awareness, added.concat(updated, removed));
    };
    doc.on("update", onDocUpdate);
    awareness.on("change", onAwarenessChange);
    awareness.on("update", onAwarenessUpdate);

    return () => {
      // Tell peers to drop our cursor before detaching the listeners. The
      // queued removal still flushes after the doc is unregistered.
      removeAwarenessStates(awareness, [doc.clientID], "unmount");
      doc.off("update", onDocUpdate);
      awareness.off("change", onAwarenessChange);
      awareness.off("update", onAwarenessUpdate);
      set!.delete(entry);
      if (set!.size === 0 && this.docs.get(entityID) === set)
        this.docs.delete(entityID);
    };
  }

  destroy() {
    this.closed = true;
    this.connected = false;
    if (this.docFlushTimeout !== null)
      window.clearTimeout(this.docFlushTimeout);
    if (this.awarenessFlushTimeout !== null)
      window.clearTimeout(this.awarenessFlushTimeout);
    this.channel?.unsubscribe();
    this.channel = null;
  }

  private send(event: string, payload: object) {
    if (!this.channel || !this.connected || this.closed) return;
    this.channel.send({ type: "broadcast", event, payload });
  }

  private announceAwareness() {
    for (let set of this.docs.values()) {
      for (let { entityID, doc, awareness } of set) {
        if (awareness.getLocalState()?.cursor)
          this.queueAwareness(entityID, awareness, [doc.clientID]);
      }
    }
  }

  private queueDocUpdate(entityID: string, update: Uint8Array) {
    let queue = this.pendingDocUpdates.get(entityID);
    if (!queue) this.pendingDocUpdates.set(entityID, (queue = []));
    queue.push(update);
    if (this.docFlushTimeout !== null) return;
    this.docFlushTimeout = window.setTimeout(() => {
      this.docFlushTimeout = null;
      for (let [entity, updates] of this.pendingDocUpdates) {
        this.send("doc-update", {
          entity,
          update: base64.fromByteArray(Y.mergeUpdates(updates)),
          schemaVersion: SCHEMA_VERSION,
        });
      }
      this.pendingDocUpdates.clear();
    }, DOC_FLUSH_INTERVAL);
  }

  private queueAwareness(
    entityID: string,
    awareness: Awareness,
    clients: number[],
  ) {
    let pending = this.pendingAwareness.get(awareness);
    if (!pending)
      this.pendingAwareness.set(
        awareness,
        (pending = { entityID, clients: new Set() }),
      );
    for (let client of clients) pending.clients.add(client);
    if (this.awarenessFlushTimeout !== null) return;
    this.awarenessFlushTimeout = window.setTimeout(() => {
      this.awarenessFlushTimeout = null;
      for (let [awareness, { entityID, clients }] of this.pendingAwareness) {
        this.send("awareness", {
          entity: entityID,
          update: base64.fromByteArray(
            encodeAwarenessUpdate(awareness, Array.from(clients)),
          ),
        });
      }
      this.pendingAwareness.clear();
    }, AWARENESS_FLUSH_INTERVAL);
  }

  private onDocBroadcast(payload: {
    entity?: string;
    update?: string;
    schemaVersion?: number;
  }) {
    if (!payload?.entity || !payload.update) return;
    // Updates from a peer on a newer schema must never reach a bound editor
    // (see components/Blocks/TextBlock/schemaVersion). The version rides on
    // every message because an incremental update doesn't necessarily contain
    // the doc's version stamp, and a separate stamp message could be dropped
    // or reordered. Pre-versioning peers send no version and count as 0.
    if ((payload.schemaVersion ?? 0) > SCHEMA_VERSION) {
      markClientStale();
      return;
    }
    let set = this.docs.get(payload.entity);
    if (!set) return;
    let update = base64.toByteArray(payload.update);
    for (let { doc } of set) {
      try {
        Y.applyUpdate(doc, update, this);
      } catch (e) {
        console.error("failed to apply remote yjs update", e);
      }
    }
  }

  private onAwarenessBroadcast(payload: { entity?: string; update?: string }) {
    if (!payload?.entity || !payload.update) return;
    let set = this.docs.get(payload.entity);
    if (!set) return;
    let update = base64.toByteArray(payload.update);
    for (let { awareness } of set) {
      try {
        applyAwarenessUpdate(awareness, update, this);
      } catch (e) {
        console.error("failed to apply remote awareness update", e);
      }
    }
  }
}

let YjsRealtimeContext = createContext<YjsRealtimeConnection | null>(null);
export const useYjsRealtime = () => useContext(YjsRealtimeContext);

export function YjsRealtimeProvider(props: {
  name: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  let [connection, setConnection] = useState<YjsRealtimeConnection | null>(
    null,
  );
  useEffect(() => {
    if (!props.enabled) return;
    let conn = new YjsRealtimeConnection(props.name);
    setConnection(conn);
    return () => {
      conn.destroy();
      setConnection(null);
    };
  }, [props.name, props.enabled]);
  return (
    <YjsRealtimeContext.Provider value={connection}>
      {props.children}
    </YjsRealtimeContext.Provider>
  );
}
