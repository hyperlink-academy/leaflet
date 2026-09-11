"use client";
import { useEffect } from "react";
import { create } from "zustand";
import { useToaster } from "components/Toast";

export const useStaleClient = create(() => ({ stale: false }));
export const markClientStale = () => useStaleClient.setState({ stale: true });

// Mounted once in the root layout (inside PopUpProvider) so going stale is
// explained to the user instead of editing silently turning off.
// Kept out of TextBlock/schemaVersion so the root layout doesn't pull in yjs
// and the prosemirror schema (and through it @atproto/api) on every page.
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
