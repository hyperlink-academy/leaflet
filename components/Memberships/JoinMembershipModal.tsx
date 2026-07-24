"use client";
import { Modal } from "components/Modal";
import { type Tier } from "app/(app)/lish/[did]/[publication]/join/JoinTiers";
import { JoinMembershipContent } from "./JoinMembershipContent";

// The membership join flow (JoinTiers) hosted in a modal instead of the /join

export function JoinMembershipModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicationUri: string;
  publicationName: string;
  publicationDescription?: string;
  newsletterMode: boolean;
  tiers: Tier[];
}) {
  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      className="max-w-full w-md"
    >
      <JoinMembershipContent
        publicationUri={props.publicationUri}
        publicationName={props.publicationName}
        newsletterMode={props.newsletterMode}
        tiers={props.tiers}
      />
    </Modal>
  );
}
