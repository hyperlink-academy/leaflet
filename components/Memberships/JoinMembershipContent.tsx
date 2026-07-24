"use client";
import { useEffect, useState } from "react";
import { DotLoader } from "components/utils/DotLoader";
import {
  JoinTiers,
  type Tier,
} from "app/(app)/lish/[did]/[publication]/join/JoinTiers";
import {
  getMembershipJoinViewer,
  type MembershipJoinViewer,
} from "actions/publications/joinMembership";

// The membership join flow (JoinTiers) with its own viewer fetch, so it can be
// dropped into a modal (JoinMembershipModal) or rendered inline (the paywall).
// Viewer state is fetched on mount since there's no server render to supply it.
export function JoinMembershipContent(props: {
  publicationUri: string;
  publicationName: string;
  newsletterMode: boolean;
  tiers: Tier[];
  unlocksPost?: boolean;
}) {
  const [viewer, setViewer] = useState<MembershipJoinViewer | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMembershipJoinViewer(props.publicationUri).then((v) => {
      if (!cancelled) setViewer(v);
    });
    return () => {
      cancelled = true;
    };
  }, [props.publicationUri]);

  if (!viewer)
    return (
      <div className="flex justify-center py-8">
        <DotLoader />
      </div>
    );

  return (
    <JoinTiers
      publicationUri={props.publicationUri}
      publicationName={props.publicationName}
      // Successful joins reload the page the reader was paywalled on so
      // the full post appears, rather than sending them to the pub home.
      publicationUrl={window.location.origin + window.location.pathname}
      tiers={props.tiers}
      unlocksPost={props.unlocksPost}
      newsletterMode={props.newsletterMode}
      loggedIn={viewer.loggedIn}
      isOwner={viewer.isOwner}
      isMember={viewer.isMember}
      email={viewer.email}
      handle={viewer.handle}
      walletCard={viewer.walletCard}
      onRefresh={async () =>
        setViewer(await getMembershipJoinViewer(props.publicationUri))
      }
      loginRedirect={() => {
        const url = new URL(window.location.href);
        url.searchParams.set("join_flow", "1");
        return url.toString();
      }}
    />
  );
}
