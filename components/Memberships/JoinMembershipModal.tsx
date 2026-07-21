"use client";
import { useEffect, useState } from "react";
import { Modal } from "components/Modal";
import { DotLoader } from "components/utils/DotLoader";
import {
  JoinTiers,
  type Tier,
} from "app/(app)/lish/[did]/[publication]/join/JoinTiers";
import {
  getMembershipJoinViewer,
  type MembershipJoinViewer,
} from "actions/publications/joinMembership";

// The membership join flow (JoinTiers) hosted in a modal instead of the /join
// page. Viewer state is fetched when the modal opens since there's no server
// render to supply it.
export function JoinMembershipModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicationUri: string;
  publicationName: string;
  tiers: Tier[];
}) {
  const [viewer, setViewer] = useState<MembershipJoinViewer | null>(null);

  useEffect(() => {
    if (!props.open) return;
    let cancelled = false;
    getMembershipJoinViewer(props.publicationUri).then((v) => {
      if (!cancelled) setViewer(v);
    });
    return () => {
      cancelled = true;
    };
  }, [props.open, props.publicationUri]);

  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      className="max-w-full w-md"
    >
      {!viewer ? (
        <div className="flex justify-center py-8">
          <DotLoader />
        </div>
      ) : (
        <JoinTiers
          publicationUri={props.publicationUri}
          publicationName={props.publicationName}
          // Successful joins reload the page the reader was paywalled on so
          // the full post appears, rather than sending them to the pub home.
          // Query params are dropped — they may carry stale flow markers
          // (wallet_session / join_flow) that would re-trigger the flow.
          publicationUrl={window.location.origin + window.location.pathname}
          tiers={props.tiers}
          loggedIn={viewer.loggedIn}
          isOwner={viewer.isOwner}
          isMember={viewer.isMember}
          hasEmail={viewer.hasEmail}
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
      )}
    </Modal>
  );
}
