"use client";
import { useMemo } from "react";
import type { Draft } from "immer";
import {
  updateIdentityData,
  useIdentityData,
  type Identity,
} from "components/IdentityProvider";
import {
  deriveSubscriptionState,
  type SubscriptionState,
} from "src/subscriptions/state";

type IdentityRows = NonNullable<Identity>;
// Helpers take the immer draft directly: checking a Draft<> against the plain
// row type is a deep structural comparison tsc gives up on.
type IdentityDraft = Draft<IdentityRows>;

// Local mirrors of the server's subscribe/unsubscribe writes, applied to the
// cached identity so every subscribe surface on the page (nav, header, footer
// panel, subscribe block) flips together instead of each one guessing from
// its own state. Only the columns deriveSubscriptionState reads are filled in
// faithfully; the revalidate that follows replaces the rows wholesale.

function setLocalEmailState(
  draft: IdentityDraft,
  publicationUri: string,
  state: "confirmed" | "unsubscribed",
) {
  const rows = (draft.publication_email_subscribers ??= []);
  const existing = rows.filter((r) => r.publication === publicationUri);
  if (existing.length === 0) {
    if (state === "confirmed")
      rows.push({
        publication: publicationUri,
        state,
      } as (typeof rows)[number]);
    return;
  }
  for (const row of existing) row.state = state;
}

function addLocalAtprotoRow(draft: IdentityDraft, publicationUri: string) {
  const rows = (draft.publication_subscriptions ??= []);
  if (rows.some((s) => s.publication === publicationUri)) return;
  // `record` is the recursive Json type, which immer's Draft<> expands past
  // tsc's instantiation limit if the literal is typed against the row.
  const row: unknown = {
    publication: publicationUri,
    identity: draft.atp_did ?? "",
    uri: "",
    record: {},
    created_at: new Date().toISOString(),
  };
  rows.push(row as never);
}

export function markLocallySubscribed(
  publicationUri: string,
  method: "email" | "atproto",
) {
  updateIdentityData((draft) => {
    if (method === "email") {
      setLocalEmailState(draft, publicationUri, "confirmed");
      // A confirmed email subscription on a linked account also publishes the
      // atproto record (onEmailSubscriptionConfirmed).
      if (draft.atp_did) addLocalAtprotoRow(draft, publicationUri);
    } else addLocalAtprotoRow(draft, publicationUri);
  });
}

export function markLocallyUnsubscribed(publicationUri: string) {
  updateIdentityData((draft) => {
    const subs = draft.publication_subscriptions ?? [];
    for (let i = subs.length - 1; i >= 0; i--)
      if (subs[i].publication === publicationUri) subs.splice(i, 1);
    setLocalEmailState(draft, publicationUri, "unsubscribed");
    for (const m of draft.publication_memberships ?? [])
      if (m.publication === publicationUri) m.status = "canceled";
  });
}

export function markLocalEmailEnabled(
  publicationUri: string,
  enabled: boolean,
) {
  updateIdentityData((draft) =>
    setLocalEmailState(
      draft,
      publicationUri,
      enabled ? "confirmed" : "unsubscribed",
    ),
  );
}

export type ViewerUser = {
  loggedIn: boolean;
  email: string | undefined;
  handle: string | undefined;
} & SubscriptionState;

export function useViewerSubscription(
  publicationUri: string | undefined,
): ViewerUser {
  const { identity } = useIdentityData();

  return useMemo(() => {
    // No identity means no rows, which derives to "not subscribed".
    const state = deriveSubscriptionState(publicationUri, {
      subscriptions: identity?.publication_subscriptions,
      emailSubscribers: identity?.publication_email_subscribers,
      memberships: identity?.publication_memberships,
    });
    return {
      loggedIn: !!identity,
      email: identity?.email ?? undefined,
      handle: identity?.bsky_profiles?.handle ?? undefined,
      ...state,
    };
  }, [identity, publicationUri]);
}
