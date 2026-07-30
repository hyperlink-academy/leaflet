"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
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
  const [unlocked, setUnlocked] = useState<UnlockedPost | null>(null);
  const [status, setStatus] = useState<UnlockStatus>("idle");

  const documentUri = document.uri;
  const shouldUnlock =
    !!document.membersOnly?.gated && !unlocked && !!identity?.id;
  // While the session's viewer identity is still resolving, an entitled member
  // would otherwise see a fully-enabled join CTA for a post they own — surface
  // the pending state through the same channel the unlock uses.
  const effectiveStatus =
    status === "idle" &&
    identityPending &&
    !!document.membersOnly?.gated &&
    !unlocked
      ? "loading"
      : status;

  useEffect(() => {
    if (!shouldUnlock) return;
    let cancelled = false;
    setStatus("loading");
    getUnlockedPost(documentUri).then(
      (result) => {
        if (cancelled) return;
        setStatus("idle");
        if (result.entitled) setUnlocked(result);
      },
      () => {
        if (!cancelled) setStatus("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [shouldUnlock, documentUri, identity?.id]);

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
