"use client";
import { useDocumentOptional } from "contexts/DocumentContext";
import { PaidSubscribeButton } from "components/Subscribe/PaidSubscribeButton";
import { PubIcon } from "components/ActionBar/Publications";
import { formatPrice } from "components/Memberships/TierGrid";
import {
  gateUnlocksWithSubscription,
  tierUnlocksGatedPost,
} from "src/membership";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { AtUri } from "@atproto/syntax";
import { LoadingTiny } from "components/Icons/LoadingTiny";
import { useUnlockStatus } from "./PostDataProvider";

const formatList = (items: string[]) =>
  new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(
    items,
  );

// Rendered in place of the members-only delimiter for readers without an
// active membership; the gated blocks were already dropped server-side. Shows
// the PaidSubscribeButton, which opens the join flow (JoinMembershipModal).
export const MembersOnlyPaywall = () => {
  let document = useDocumentOptional();
  let unlockStatus = useUnlockStatus();

  let pub = document?.publication;
  if (!pub) return null;

  // The membership check runs client-side (the page itself is cached and
  // anonymous). While it's pending the viewer may turn out to be an entitled
  // member, so hold the join pitch — flashing it and then swapping in the full
  // post reads as a glitch. "loading" only happens for viewers with a session
  // marker; definitely-anonymous readers get the pitch immediately.
  if (unlockStatus === "loading")
    return (
      <div className="membersOnlyPaywall my-4 flex flex-col items-center gap-2 text-center block-border bg-bg-page px-4 py-6">
        <div
          role="status"
          aria-label="Checking access"
          className="flex items-center gap-1 font-bold text-secondary"
        >
          <LoadingTiny className="animate-spin shrink-0" />
        </div>
      </div>
    );

  let tiers = document?.membersOnly?.tiers ?? [];
  let unlockingTierIds = document?.membersOnly?.unlockingTierIds ?? null;

  let subscriptionUnlocks = gateUnlocksWithSubscription(
    unlockingTierIds,
    tiers,
  );
  let paidUnlockingTiers = tiers.filter(
    (t) => !t.is_free && tierUnlocksGatedPost(t, unlockingTierIds),
  );
  let startingPriceCents = paidUnlockingTiers.length
    ? Math.min(...paidUnlockingTiers.map((t) => t.monthly_price_cents))
    : null;

  let namedTiers =
    paidUnlockingTiers.length < tiers.filter((t) => !t.is_free).length
      ? paidUnlockingTiers.map((t) => t.name)
      : [];

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
          {subscriptionUnlocks
            ? "Subscribe to continue reading"
            : "Become a member to continue reading"}
        </h3>
        {subscriptionUnlocks ? (
          <p>Free for subscribers</p>
        ) : (
          startingPriceCents !== null && (
            <p>
              {namedTiers.length > 0
                ? `Available on the ${formatList(namedTiers)} ${namedTiers.length > 1 ? "tiers" : "tier"}, from ${formatPrice(startingPriceCents)}/month`
                : `Memberships start at ${formatPrice(startingPriceCents)}/month`}
            </p>
          )
        )}
      </div>
      <PaidSubscribeButton
        publicationUri={pub.uri}
        publicationName={pub.name}
        newsletterMode={pub.newsletterMode}
        tiers={tiers}
        unlocksPost
        unlocksPostTierIds={unlockingTierIds}
      />
    </div>
  );
};
