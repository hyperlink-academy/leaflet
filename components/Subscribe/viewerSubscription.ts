"use client";
import { useMemo } from "react";
import { useIdentityData } from "components/IdentityProvider";

export type ViewerUser = {
  loggedIn: boolean;
  email: string | undefined;
  handle: string | undefined;
  atprotoSubscribed: boolean;
  emailSubscribed: boolean;
};

export function useViewerSubscription(publicationUri: string): ViewerUser {
  const { identity } = useIdentityData();

  return useMemo(() => {
    const atprotoSubscribed =
      !!identity &&
      (identity.publication_subscriptions ?? []).some(
        (s) => s.publication === publicationUri,
      );
    const emailSubscribed =
      !!identity &&
      (identity.publication_email_subscribers ?? []).some(
        (s) => s.publication === publicationUri && s.state === "confirmed",
      );
    return {
      loggedIn: !!identity,
      email: identity?.email ?? undefined,
      handle: identity?.bsky_profiles?.handle ?? undefined,
      atprotoSubscribed,
      emailSubscribed,
    };
  }, [identity, publicationUri]);
}
