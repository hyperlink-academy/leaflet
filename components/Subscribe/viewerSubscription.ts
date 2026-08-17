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
    const state = identity
      ? deriveSubscriptionState(publicationUri, {
          subscriptions: identity.publication_subscriptions,
          emailSubscribers: identity.publication_email_subscribers,
          memberships: identity.publication_memberships,
        })
      : {
          subscribed: false,
          atprotoSubscribed: false,
          emailEnabled: false,
          membership: null,
        };
    return {
      loggedIn: !!identity,
      email: identity?.email ?? undefined,
      handle: identity?.bsky_profiles?.handle ?? undefined,
      ...state,
    };
  }, [identity, publicationUri]);
}
