"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { useIdentityData } from "components/IdentityProvider";

// Live multiplayer layer for text blocks. Each client broadcasts incremental
// yjs document updates and cursor (awareness) state over a supabase realtime
// channel scoped to the leaflet. Document updates are also persisted through
// replicache, which stays the source of truth; because yjs updates are CRDTs,
// applying the same change from both the channel and a replicache pull
// converges. Awareness state is ephemeral and only ever travels over the
// channel — never through replicache.
//
// Doc updates are routed per entity (each block is its own Y.Doc), but
// awareness is a single connection-level instance whose cursor state carries
// the entityID it points into. Received awareness is applied unconditionally
// and simply *stored* — including state for blocks this client hasn't synced
// or mounted yet — and editors filter by entityID at render time. That means
// a block that mounts later (a newly synced block, a subpage opened after a
// peer placed their caret) finds the caret already in the shared state, with
// no replay protocol needed.

const DOC_FLUSH_INTERVAL = 50;
const AWARENESS_FLUSH_INTERVAL = 80;

// One hue for the whole session, carried in the awareness user field; each
// peer derives the actual cursor color from their own theme's accent (see
// collabCursor.ts).
const sessionHue = Math.floor(Math.random() * 8) * 45;

export class YjsRealtimeConnection {
  private channel: RealtimeChannel | null = null;
  private connected = false;
  private closed = false;
  // Number of *other* clients on the channel, tracked via presence. Doc and
  // awareness broadcasts are suppressed while this is 0: a solo editor's
  // stream has no receivers, but every message is still billed by supabase,
  // and solo sessions are the common case. Peers that join later converge
  // through replicache (docs) and the join-time announce below (cursors), so
  // nothing is lost by not broadcasting into an empty room.
  private otherPeers = 0;
  private presenceKey = crypto.randomUUID();
  // Clients from before presence tracking never show up in otherPeers, but
  // they do broadcast unconditionally — so anything received recently also
  // counts as a peer being present.
  private lastRemoteBroadcast = 0;
  // The same entityID can be mounted by more than one editor at once (e.g. a
  // footnote rendered in both the side column and the bottom section), each
  // with its own doc, so an entity maps to a set of docs.
  private docs = new Map<string, Set<Y.Doc>>();
  private pendingDocUpdates = new Map<string, Uint8Array[]>();
  private pendingAwarenessClients = new Set<number>();
  private docFlushTimeout: number | null = null;
  private awarenessFlushTimeout: number | null = null;

  constructor(
    private name: string,
    readonly awareness: Awareness,
  ) {
    this.awareness.on("update", this.onLocalAwarenessUpdate);
  }

  // Broadcast every awareness update we didn't ourselves apply from the
  // channel: local cursor changes, the ~15s keep-alive renewal (needed so
  // peers' 30s staleness timeout doesn't drop us while idle), and timeout
  // removals of stale peers. The send gate drops all of it while solo.
  private onLocalAwarenessUpdate = (
    {
      added,
      updated,
      removed,
    }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    if (origin === this) return;
    this.queueAwareness(added.concat(updated, removed));
  };

  // The channel is only opened once an editor registers a doc, so replicache
  // providers without any mounted editors don't open extra sockets. This is a
  // separate topic from the `rootEntity:` poke channel — joining the same
  // phoenix topic twice closes the first subscription.
  private ensureChannel() {
    if (this.channel || this.closed) return;
    let supabase = supabaseBrowserClient();
    this.channel = supabase.channel(`yjs:${this.name}`, {
      config: {
        // Current supabase servers only activate presence when the join
        // payload carries `enabled` — without it, track() still acks "ok"
        // but no presence event ever fires on any client. Our pinned
        // realtime-js (2.9.5) predates the flag, hence the cast.
        presence: { key: this.presenceKey, enabled: true } as {
          key: string;
        },
      },
    });
    this.channel.on("broadcast", { event: "doc-update" }, ({ payload }) => {
      this.lastRemoteBroadcast = Date.now();
      this.onDocBroadcast(payload);
    });
    this.channel.on("broadcast", { event: "awareness" }, ({ payload }) => {
      this.lastRemoteBroadcast = Date.now();
      this.onAwarenessBroadcast(payload);
    });
    // A peer that presence can't see announced itself (a client from an old
    // deploy, or presence silently broken — which has happened in prod:
    // without the `enabled` flag above it never fires at all, and only this
    // hello/lastRemoteBroadcast pair kept sync alive). Receiving it opens
    // the 2-minute send window; replay our cursor state since the presence
    // join announce never fired for them.
    this.channel.on("broadcast", { event: "hello" }, () => {
      this.lastRemoteBroadcast = Date.now();
      this.queueAwareness([this.awareness.clientID]);
    });
    this.channel.on("presence", { event: "sync" }, () => {
      this.otherPeers = Object.keys(this.channel?.presenceState() ?? {}).filter(
        (key) => key !== this.presenceKey,
      ).length;
    });
    // A peer we haven't seen appeared (the initial presence sync also fires a
    // join per already-present key, so this covers both us joining a live
    // room and someone joining ours): replay our full awareness state, since
    // anything sent while we were alone was suppressed and the newcomer
    // missed everything from before it subscribed. Keyed on join events
    // rather than an otherPeers increase — a coalesced presence sync where
    // one peer joins as another leaves doesn't change the count.
    this.channel.on("presence", { event: "join" }, ({ key }) => {
      if (key === this.presenceKey) return;
      this.queueAwareness([this.awareness.clientID]);
    });
    // Presence reports departures ~immediately; without this a closed tab's
    // caret would linger until the 30s awareness staleness timeout.
    this.channel.on(
      "presence",
      { event: "leave" },
      ({ key, leftPresences }) => {
        if (key === this.presenceKey) return;
        let clients = leftPresences
          .map((p) => p.awarenessClientID)
          .filter((id): id is number => typeof id === "number");
        if (clients.length > 0)
          removeAwarenessStates(this.awareness, clients, "presence-leave");
      },
    );
    this.channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        this.connected = true;
        await this.channel?.track({
          awarenessClientID: this.awareness.clientID,
        });
        // One gate-exempt message per join: it must reach peers even when
        // both sides believe they're alone, because it's the bootstrap that
        // detects peers presence can't count (see the hello handler above).
        this.channel?.send({ type: "broadcast", event: "hello", payload: {} });
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        this.connected = false;
      }
    });
  }

  register(entityID: string, doc: Y.Doc) {
    this.ensureChannel();
    let set = this.docs.get(entityID);
    if (!set) this.docs.set(entityID, (set = new Set()));
    set.add(doc);

    const onDocUpdate = (update: Uint8Array, origin: unknown) => {
      // Updates applied from replicache have no origin and updates received
      // over the channel have this connection as their origin; only local
      // edits (whose origin is the prosemirror binding) are broadcast.
      if (!origin || origin === this) return;
      this.queueDocUpdate(entityID, update);
    };
    doc.on("update", onDocUpdate);

    return () => {
      doc.off("update", onDocUpdate);
      set!.delete(doc);
      if (set!.size === 0 && this.docs.get(entityID) === set)
        this.docs.delete(entityID);
    };
  }

  destroy() {
    this.awareness.off("update", this.onLocalAwarenessUpdate);
    if (this.docFlushTimeout !== null)
      window.clearTimeout(this.docFlushTimeout);
    if (this.awarenessFlushTimeout !== null) {
      window.clearTimeout(this.awarenessFlushTimeout);
      // Unmounting editors just cleared their cursor state; flush it now so
      // peers drop our caret immediately instead of on the 30s timeout.
      this.flushAwareness();
    }
    this.closed = true;
    this.connected = false;
    this.channel?.unsubscribe();
    this.channel = null;
  }

  private send(event: string, payload: object) {
    if (!this.channel || !this.connected || this.closed) return;
    if (
      this.otherPeers === 0 &&
      Date.now() - this.lastRemoteBroadcast > 2 * 60_000
    )
      return;
    this.channel.send({ type: "broadcast", event, payload });
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

  private queueAwareness(clients: number[]) {
    for (let client of clients) this.pendingAwarenessClients.add(client);
    if (this.awarenessFlushTimeout !== null) return;
    this.awarenessFlushTimeout = window.setTimeout(() => {
      this.awarenessFlushTimeout = null;
      this.flushAwareness();
    }, AWARENESS_FLUSH_INTERVAL);
  }

  private flushAwareness() {
    if (this.pendingAwarenessClients.size === 0) return;
    // encodeAwarenessUpdate encodes each client's *current* state, so a
    // clear-then-set within one flush window wires as a single set.
    this.send("awareness", {
      update: base64.fromByteArray(
        encodeAwarenessUpdate(
          this.awareness,
          Array.from(this.pendingAwarenessClients),
        ),
      ),
    });
    this.pendingAwarenessClients.clear();
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
    for (let doc of set) {
      try {
        Y.applyUpdate(doc, update, this);
      } catch (e) {
        console.error("failed to apply remote yjs update", e);
      }
    }
  }

  private onAwarenessBroadcast(payload: { update?: string }) {
    if (!payload?.update) return;
    try {
      applyAwarenessUpdate(
        this.awareness,
        base64.toByteArray(payload.update),
        this,
      );
    } catch (e) {
      console.error("failed to apply remote awareness update", e);
    }
  }
}

type YjsRealtime = {
  connection: YjsRealtimeConnection | null;
  awareness: Awareness;
};
let YjsRealtimeContext = createContext<YjsRealtime | null>(null);
export const useYjsRealtime = () => useContext(YjsRealtimeContext);

export function YjsRealtimeProvider(props: {
  name: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  // The shared awareness is created synchronously and lives for the whole
  // provider lifetime, independent of the channel: editors capture it in
  // their cursor plugins at mount, so its identity must not change when the
  // connection appears (or when `enabled` is off — then it simply never has
  // peers). Its doc exists only to give the awareness a clientID; cursor
  // relative positions are always resolved against the blocks' own docs.
  let [awareness] = useState(() => new Awareness(new Y.Doc()));
  let [connection, setConnection] = useState<YjsRealtimeConnection | null>(
    null,
  );
  // StrictMode's dev-only unmount/remount reuses the same state value, and a
  // destroyed Awareness silently drops every setLocalState and has a dead
  // keep-alive interval. Destroy on a deferred tick that a remount cancels:
  // StrictMode's cleanup and re-run happen synchronously, so only a true
  // unmount lets it fire.
  let destroyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (destroyTimeout.current !== null) clearTimeout(destroyTimeout.current);
    destroyTimeout.current = null;
    return () => {
      destroyTimeout.current = setTimeout(() => awareness.destroy(), 0);
    };
  }, [awareness]);
  let { identity } = useIdentityData();
  let userName =
    identity?.bsky_profiles?.record?.displayName ||
    identity?.bsky_profiles?.handle ||
    "Anonymous";
  useEffect(() => {
    awareness.setLocalStateField("user", { name: userName, hue: sessionHue });
  }, [awareness, userName]);
  useEffect(() => {
    if (!props.enabled) return;
    let conn = new YjsRealtimeConnection(props.name, awareness);
    setConnection(conn);
    return () => {
      conn.destroy();
      setConnection(null);
    };
  }, [props.name, props.enabled, awareness]);
  let value = useMemo(
    () => ({ connection, awareness }),
    [connection, awareness],
  );
  return (
    <YjsRealtimeContext.Provider value={value}>
      {props.children}
    </YjsRealtimeContext.Provider>
  );
}
