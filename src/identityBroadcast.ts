"use client";
import { useEffect, useRef } from "react";

// Cross-tab announcement that the session cookie changed identity (account
// switch, logout falling through to another saved account, add-account). The
// cookie is shared browser-wide, so every other same-origin tab is now acting
// as the new identity while still rendering the old one — writes from those
// tabs would be attributed to the wrong account. Identity-keyed surfaces
// (dashboard, editor) must respond with a full reload, for the same reason the
// switching tab itself navigates instead of mutating in place: Replicache, SWR
// caches, and realtime channels are all keyed to the previous identity.
// Static published pages only need to revalidate their viewer fetch — their
// identity-gated islands re-key off the viewer and refetch on their own.
// BroadcastChannel is same-origin, so tabs on custom domains won't hear this;
// they already tolerate stale sessions (the marker gate refetches per load).
const CHANNEL_NAME = "leaflet-identity-change";

type IdentityChangeMessage = {
  // The identity now in the session cookie; null when logged out or unknown
  // (the add-account flow doesn't learn the new id client-side).
  identity: string | null;
};

export function broadcastIdentityChange(identity: string | null) {
  if (typeof BroadcastChannel === "undefined") return;
  let channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage({ identity } satisfies IdentityChangeMessage);
  channel.close();
}

// Fires in every other tab when one tab broadcasts. The sender never receives
// its own message (per the BroadcastChannel spec), so senders handle their own
// navigation separately.
export function useIdentityChangeListener(
  onChange: (newIdentity: string | null) => void,
) {
  let handler = useRef(onChange);
  handler.current = onChange;
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    let channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (e) => {
      let identity = (e.data as IdentityChangeMessage | undefined)?.identity;
      handler.current(typeof identity === "string" ? identity : null);
    };
    return () => channel.close();
  }, []);
}

// For identity-keyed surfaces: reload unless this tab already renders the
// identity the cookie switched to.
export function useReloadOnIdentityChange(
  currentIdentity: string | null | undefined,
) {
  useIdentityChangeListener((newIdentity) => {
    if (newIdentity !== null && newIdentity === currentIdentity) return;
    window.location.reload();
  });
}
