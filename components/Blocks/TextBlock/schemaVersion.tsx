"use client";
import { useEffect } from "react";
import * as Y from "yjs";
import { create } from "zustand";
import { useToaster } from "components/Toast";
import { SCHEMA_VERSION } from "./schema";

// Clients with different prosemirror schemas must never sync over yjs:
// y-prosemirror deletes content it can't represent *from the shared document*
// (sync-plugin's createNodeFromYElement catches the schema error and deletes
// the yjs item), and the deletion is then persisted through replicache and
// broadcast to peers — a client on an old deploy merely opening a doc with
// newer content would destroy that content for everyone.
//
// So every doc carries the schema version it was last edited with, and both
// ways remote content can reach a live editor doc check it *before* applying:
//   - the block/text fact from replicache (useYJSValue), via the version
//     stamped into the doc state itself, and
//   - doc-update broadcasts over the realtime channel (yjsRealtime), via a
//     version field on the message envelope, since an incremental update
//     doesn't necessarily contain the stamp.
// When newer-schema content shows up, the whole client is stale — the version
// is a property of the bundle, not of one block — so every editor falls back
// to its static read-only renderer until the user refreshes.

const META_KEY = "schemaVersion";

export const docSchemaVersion = (doc: Y.Doc) =>
  (doc.getMap("meta").get(META_KEY) as number | undefined) ?? 0;

// The schema version a yjs update (or full doc state) was written with.
// Versioning shipped with v1, so content with no recorded version is v0,
// which every version-checking client can edit.
export const updateSchemaVersion = (update: Uint8Array) => {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, update);
  const version = docSchemaVersion(doc);
  doc.destroy();
  return version;
};

// Record the highest schema version that has edited this doc; called before
// every persist. Only writers that can produce post-v0 nodes need to stamp —
// the editors do, plaintext helpers like createYjsText don't.
export const stampDocSchemaVersion = (doc: Y.Doc) => {
  if (docSchemaVersion(doc) < SCHEMA_VERSION)
    doc.getMap("meta").set(META_KEY, SCHEMA_VERSION);
};

export const useStaleClient = create(() => ({ stale: false }));
export const markClientStale = () => useStaleClient.setState({ stale: true });

// Mounted once in the root layout (inside PopUpProvider) so going stale is
// explained to the user instead of editing silently turning off.
export function StaleClientNotice() {
  let stale = useStaleClient((s) => s.stale);
  let toaster = useToaster();
  useEffect(() => {
    if (!stale) return;
    toaster({
      type: "info",
      duration: 60000,
      content: (
        <div>
          Leaflet has been updated!{" "}
          <button
            className="underline font-bold"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>{" "}
          to keep editing.
        </div>
      ),
    });
  }, [stale, toaster]);
  return null;
}
