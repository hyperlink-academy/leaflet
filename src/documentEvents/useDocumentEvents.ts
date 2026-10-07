"use client";
import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseBrowserClient } from "supabase/browserClient";
import {
  DOCUMENT_EVENT,
  documentEventsTopic,
  type DocumentEvent,
  type DocumentEventKind,
} from "./index";

// Everything received on a topic is fanned out to the hooks mounted for it;
// each hook filters down to its own document and kinds. Events broadcast
// while the socket was down are gone, so a resubscribe after a drop tells
// every listener to refetch as if an event had arrived.
type Listener = (event: DocumentEvent | { kind: "resync" }) => void;
type Subscription = { channel: RealtimeChannel; listeners: Set<Listener> };
const subscriptions = new Map<string, Subscription>();

function subscribe(topic: string, listener: Listener) {
  let sub = subscriptions.get(topic);
  if (!sub) {
    let channel = supabaseBrowserClient().channel(topic);
    let listeners = new Set<Listener>();
    channel.on("broadcast", { event: DOCUMENT_EVENT }, ({ payload }) => {
      for (let l of listeners) l(payload as DocumentEvent);
    });
    let subscribedOnce = false;
    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      if (subscribedOnce) for (let l of listeners) l({ kind: "resync" });
      subscribedOnce = true;
    });
    sub = { channel, listeners };
    subscriptions.set(topic, sub);
  }
  sub.listeners.add(listener);
  return () => {
    sub.listeners.delete(listener);
    if (sub.listeners.size > 0) return;
    subscriptions.delete(topic);
    supabaseBrowserClient().removeChannel(sub.channel);
  };
}

// Calls `onEvent` whenever one of `kinds` happens on `subject` (or when the
// connection recovered and anything might have). The channel for the
// subject's repo stays open while any hook for it is mounted, so mount this
// only where the live view is on screen: an open socket counts against
// supabase's concurrent-connection quota.
export function useDocumentEvents(
  subject: string | null | undefined,
  kinds: DocumentEventKind[],
  onEvent: () => void,
) {
  let onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  });
  let kindsKey = kinds.join(",");
  useEffect(() => {
    if (!subject) return;
    let topic: string;
    try {
      topic = documentEventsTopic(subject);
    } catch {
      return;
    }
    let wanted = new Set(kindsKey.split(","));
    return subscribe(topic, (event) => {
      if (event.kind === "resync") return onEventRef.current();
      if (event.subject === subject && wanted.has(event.kind))
        onEventRef.current();
    });
  }, [subject, kindsKey]);
}
