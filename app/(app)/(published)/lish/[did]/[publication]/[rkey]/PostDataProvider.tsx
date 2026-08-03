"use client";
import { createContext, useContext, useMemo } from "react";
import useSWRImmutable from "swr/immutable";
import { AppBskyFeedDefs } from "@atproto/api";
import type { PubLeafletContent } from "lexicons/api";
import { DocumentProvider } from "contexts/DocumentContext";
import { LeafletContentProvider } from "contexts/LeafletContentContext";
import { useIdentityData } from "components/IdentityProvider";
import { getUnlockedPost, type UnlockedPost } from "actions/getUnlockedPost";
import type { PostPageData } from "src/utils/getPostPageData";
import type { StandardSitePostData } from "app/api/rpc/[command]/get_standard_site_posts";
import type { PollData } from "./fetchPollData";

export type PostResources = {
  pages: PubLeafletContent.Main["pages"];
  bskyPostData: AppBskyFeedDefs.PostView[];
  standardSitePostData: StandardSitePostData[];
  pollData: PollData[];
};

export type UnlockStatus = "idle" | "loading" | "error";

const PostResourcesContext = createContext<PostResources | null>(null);
const UnlockStatusContext = createContext<UnlockStatus>("idle");

export function usePostResources() {
  const ctx = useContext(PostResourcesContext);
  if (!ctx)
    throw new Error("usePostResources must be used within PostDataProvider");
  return ctx;
}

export function useUnlockStatus() {
  return useContext(UnlockStatusContext);
}

// Owns everything the members-only unlock replaces. The gated flag, the pages
// and the three block-resource channels all hang off one piece of state, so an
// unlock flips them in a single render — the paywall can never be on screen
// next to the blocks it's supposed to be hiding, and vice versa.
export function PostDataProvider(props: {
  document: NonNullable<PostPageData>;
  initial: PostResources;
  children: React.ReactNode;
}) {
  const { document, initial } = props;
  const { identity, identityPending } = useIdentityData();

  const documentUri = document.uri;
  const gated = !!document.membersOnly?.gated;
  // Keyed per (post, viewer) in the SWR module cache so the unlock survives
  // navigations — a member returning to a post they already unlocked renders
  // the full content on the first frame instead of re-flashing the paywall
  // while a fresh entitlement check round-trips. A join completes via a full
  // page reload, so a cached { entitled: false } can't go stale mid-session.
  const { data, error } = useSWRImmutable(
    gated && identity?.id ? ["unlocked-post", documentUri, identity.id] : null,
    () => getUnlockedPost(documentUri),
  );
  const unlocked: UnlockedPost | null = data?.entitled ? data : null;

  // While the viewer identity or the unlock itself is still resolving, an
  // entitled member would otherwise see a fully-enabled join CTA for a post
  // they can read — surface the pending state until the check settles.
  const effectiveStatus: UnlockStatus =
    !gated || unlocked
      ? "idle"
      : error
        ? "error"
        : identityPending || (identity?.id && !data)
          ? "loading"
          : "idle";

  const resources = unlocked ?? initial;
  const documentValue = useMemo(
    () =>
      unlocked && document.membersOnly
        ? {
            ...document,
            membersOnly: { ...document.membersOnly, gated: false },
          }
        : document,
    [document, unlocked],
  );
  const content = useMemo(
    () => ({ pages: resources.pages }),
    [resources.pages],
  );

  return (
    <DocumentProvider value={documentValue}>
      <LeafletContentProvider value={content}>
        <PostResourcesContext.Provider value={resources}>
          <UnlockStatusContext.Provider value={effectiveStatus}>
            {props.children}
          </UnlockStatusContext.Provider>
        </PostResourcesContext.Provider>
      </LeafletContentProvider>
    </DocumentProvider>
  );
}
