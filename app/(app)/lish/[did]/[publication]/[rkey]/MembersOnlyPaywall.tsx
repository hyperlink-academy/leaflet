"use client";
import { useDocumentOptional } from "contexts/DocumentContext";
import { PaidSubscribeButton } from "components/Subscribe/PaidSubscribeButton";
import { PubIcon } from "components/ActionBar/Publications";
import { formatPrice } from "components/Memberships/TierGrid";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { AtUri } from "@atproto/syntax";

// Rendered in place of the members-only delimiter for readers without an
// active membership; the gated blocks were already dropped server-side. Shows
// the PaidSubscribeButton, which opens the join flow (JoinMembershipModal).
export const MembersOnlyPaywall = () => {
  let document = useDocumentOptional();

  let pub = document?.publication;
  if (!pub) return null;
  let tiers = document?.membersOnly?.tiers ?? [];
  let paidTiers = tiers.filter((t) => !t.is_free);
  let startingPriceCents = paidTiers.length
    ? Math.min(...paidTiers.map((t) => t.monthly_price_cents))
    : null;

  return (
    <div className="membersOnlyPaywall light-container flex flex-col items-center gap-3 text-center block-border bg-bg-page px-4 py-4 my-4 sm:my-6">
      <PubIcon
        icon={
          pub?.record?.icon
            ? blobRefToSrc(pub.record.icon.ref, new AtUri(pub.uri).host)
            : undefined
        }
        pubName={pub?.record?.name}
        large
      />
      <div className="">
        <h3 className="leading-tight pb-1">
          Become a member to continue reading
        </h3>
        {startingPriceCents !== null && (
          <p>Memberships start at {formatPrice(startingPriceCents)}/month</p>
        )}
      </div>
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
