"use client";
import { Modal } from "components/Modal";
import { JoinMembershipFlow } from "./JoinMembershipFlow";
import { type JoinResume } from "./joinReturn";
import { type Tier } from "./TierGrid";
import { type MembershipJoinViewer } from "actions/publications/joinMembership";

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
  resume?: JoinResume | null;
  // Test-harness seam, threaded to the flow.
  viewerOverride?: MembershipJoinViewer;
}) {
  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      className="max-w-full w-fit p-4 pt-3 sm:p-6 sm:pt-5"
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
        resume={props.resume}
        viewerOverride={props.viewerOverride}
      />
    </Modal>
  );
}
