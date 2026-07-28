"use client";
import { useDocumentOptional } from "contexts/DocumentContext";
import { PaidSubscribeButton } from "components/Subscribe/PaidSubscribeButton";

// Rendered in place of the members-only delimiter for readers without an
// active membership; the gated blocks were already dropped server-side. Shows
// the PaidSubscribeButton, which opens the join flow (JoinMembershipModal).
export const MembersOnlyPaywall = () => {
  let document = useDocumentOptional();

  let pub = document?.publication;
  if (!pub) return null;
  let tiers = document?.membersOnly?.tiers ?? [];

  return (
    <div className="membersOnlyPaywall light-container flex flex-col items-center gap-3 text-center block-border bg-bg-page px-4 py-4">
      <PaidSubscribeButton
        publicationUri={pub.uri}
        publicationName={pub.name}
        newsletterMode={pub.newsletterMode}
        tiers={tiers}
        unlocksPost
      />
    </div>
  );
};
