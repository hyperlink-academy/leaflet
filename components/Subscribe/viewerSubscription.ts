"use client";
import { useMemo } from "react";
import { useIdentityData } from "components/IdentityProvider";
import {
  deriveSubscriptionState,
  type SubscriptionState,
} from "src/subscriptions/state";

export type ViewerUser = {
  loggedIn: boolean;
  email: string | undefined;
  handle: string | undefined;
} & SubscriptionState;

export function useViewerSubscription(publicationUri: string): ViewerUser {
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
