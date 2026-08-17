"use client";
import { useEffect, useState } from "react";
import { ButtonPrimary } from "components/Buttons";
import { ManageSubscription } from "./ManageSubscribe";
import { useViewerSubscription } from "./viewerSubscription";
import type { SubscribeProps } from "./SubscribeButton";
import { JoinMembershipModal } from "components/Memberships/JoinMembershipModal";
import {
  readJoinResume,
  type JoinResume,
} from "components/Memberships/joinReturn";
import type { Tier } from "components/Memberships/TierGrid";
import type { MembershipJoinViewer } from "actions/publications/joinMembership";

// The subscribe control for publications with paid tiers. Styled like
// SubscribeButton, but instead of one-click subscribing it opens the paid join
// flow (JoinMembershipModal): identity, tier, then payment. Rendered wherever
// SubscribeButton/SubscribeInput would be — they delegate here when
// useJoinableTiers finds paid tiers.
export const PaidSubscribeButton = (
  props: SubscribeProps & {
    tiers: Tier[];
    // Badges the tiers with "Unlocks post" — set by the members-only paywall,
    // where joining reveals the post the reader is on. unlocksPostTierIds
    // narrows the badge to the tiers the post's delimiter names.
    unlocksPost?: boolean;
    unlocksPostTierIds?: string[] | null;
    // Test-harness seam, threaded to the modal.
    viewerOverride?: MembershipJoinViewer;
    compact?: boolean;
  },
) => {
  const user = useViewerSubscription(props.publicationUri);
  const [open, setOpen] = useState(false);
  const [resume, setResume] = useState<JoinResume | null>(null);

  // The join flow leaves for Stripe card setup or sign-in and returns to this
  // page with markers in the URL. The modal isn't mounted on load, so the
  // button claims the return (first of possibly several surfaces on the page
  // wins) and reopens the modal to finish the join.
  useEffect(() => {
    const r = readJoinResume();
    if (!r) return;
    setResume(r);
    setOpen(true);
  }, []);

  const showManage = props.newsletterMode
    ? user.emailSubscribed
    : user.atprotoSubscribed;

  return (
    <>
      <ManageSubscription
        publicationUri={props.publicationUri}
        publicationUrl={props.publicationUrl}
        newsletterMode={props.newsletterMode}
        user={user}
      />

      {/* Stays mounted while the flow subscribes the reader mid-join, so the
          payment step isn't lost when showManage flips. */}
      <JoinMembershipModal
        open={open}
        onOpenChange={setOpen}
        publicationUri={props.publicationUri}
        publicationUrl={props.publicationUrl}
        publicationName={props.publicationName}
        newsletterMode={props.newsletterMode}
        tiers={props.tiers}
        unlocksPost={props.unlocksPost}
        unlocksPostTierIds={props.unlocksPostTierIds}
        resume={resume}
        source={props.source}
        viewerOverride={props.viewerOverride}
      />
    </>
  );
};
