"use client";
import { useMemo } from "react";
import { useIdentityData } from "components/IdentityProvider";

export type ViewerUser = {
  loggedIn: boolean;
  email: string | undefined;
  handle: string | undefined;
  subscribed: boolean;
};

export function useViewerSubscription(publicationUri: string): ViewerUser {
  const { identity } = useIdentityData();

  return useMemo(() => {
    const subscribed =
      !!identity &&
      ((identity.publication_subscriptions ?? []).some(
        (s) => s.publication === publicationUri,
      ) ||
        (identity.publication_email_subscribers ?? []).some(
          (s) => s.publication === publicationUri && s.state === "confirmed",
        ));
    return {
      loggedIn: !!identity,
      email: identity?.email ?? undefined,
      handle: identity?.bsky_profiles?.handle ?? undefined,
      subscribed,
    };
  }, [identity, publicationUri]);
}
