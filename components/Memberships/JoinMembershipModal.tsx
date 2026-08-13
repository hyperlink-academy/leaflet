"use client";
import { Modal } from "components/Modal";
import { JoinMembershipFlow } from "./JoinMembershipFlow";
import { type JoinResume } from "./joinReturn";
import { type Tier } from "./TierGrid";
import { type MembershipJoinViewer } from "actions/publications/joinMembership";
import type { SubscriptionSource } from "src/subscriptionSource";

// The paid join flow (JoinMembershipFlow) hosted in a modal, opened by
// PaidSubscribeButton. The /join page renders the same flow inline.
export function JoinMembershipModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicationUri: string;
  publicationName: string;
  publicationUrl?: string;
  newsletterMode: boolean;
  tiers: Tier[];
  unlocksPost?: boolean;
  unlocksPostTierIds?: string[] | null;
  resume?: JoinResume | null;
  source?: SubscriptionSource;
  // Test-harness seam, threaded to the flow.
  viewerOverride?: MembershipJoinViewer;
}) {
  return (
    <Modal
      sheetOnMobile
      open={props.open}
      onOpenChange={props.onOpenChange}
      className="max-w-full w-fit p-4 pt-3  sm:p-6 sm:pb-8 sm:pt-5 bg-[var(--color-bg-light)]!"
    >
      <JoinMembershipFlow
        active={props.open}
        onClose={() => props.onOpenChange(false)}
        publicationUri={props.publicationUri}
        publicationName={props.publicationName}
        publicationUrl={props.publicationUrl}
        newsletterMode={props.newsletterMode}
        tiers={props.tiers}
        unlocksPost={props.unlocksPost}
        unlocksPostTierIds={props.unlocksPostTierIds}
        resume={props.resume}
        source={props.source}
        viewerOverride={props.viewerOverride}
      />
      <div className="spacer h-6 sm:hidden" />
    </Modal>
  );
}
