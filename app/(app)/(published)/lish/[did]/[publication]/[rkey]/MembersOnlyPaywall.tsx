"use client";
import { useDocumentOptional } from "contexts/DocumentContext";
import { useState } from "react";
import { PaidSubscribeButton } from "components/Subscribe/PaidSubscribeButton";
import { ManageSubscription } from "components/Subscribe/ManageSubscribe";
import { useViewerSubscription } from "components/Subscribe/viewerSubscription";
import { ButtonPrimary } from "components/Buttons";
import { PubIcon } from "components/ActionBar/Publications";
import { formatPrice } from "components/Memberships/TierGrid";
import { useMyMembership } from "components/Memberships/useMyMembership";
import { revalidateUnlocks } from "components/Memberships/revalidateUnlocks";
import { membershipUnlocksGatedPost } from "src/membership";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { AtUri } from "@atproto/syntax";
import { LoadingTiny } from "components/Icons/LoadingTiny";
import { useUnlockStatus } from "./PostDataProvider";
import { ChangePlanModal } from "components/Memberships/ChangePlanModal";

// Rendered in place of the members-only delimiter for readers without an
// active membership; the gated blocks were already dropped server-side. Shows
// the PaidSubscribeButton, which opens the join flow (JoinMembershipModal).
export const MembersOnlyPaywall = () => {
  let document = useDocumentOptional();
  let unlockStatus = useUnlockStatus();

  let pub = document?.publication;
  let viewer = useViewerSubscription(pub?.uri);
  let { membership } = useMyMembership(pub?.uri ?? "");
  let [changingPlan, setChangingPlan] = useState(false);
  if (!pub) return null;

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

  let membershipTiers = document?.membersOnly?.tiers;
  if (!membershipTiers) return null;
  let tiers = membershipTiers.paid;
  let gatePolicy = document?.membersOnly?.gatePolicy ?? null;

  let subscriptionUnlocks = gatePolicy?.audience === "subscribers";
  let paidUnlockingTiers = tiers.filter((tier) =>
    membershipUnlocksGatedPost({ kind: "paid", tierId: tier.id }, gatePolicy),
  );
  let startingPriceCents = paidUnlockingTiers.length
    ? Math.min(...paidUnlockingTiers.map((t) => t.monthly_price_cents))
    : null;

  let namedTiers =
    paidUnlockingTiers.length < tiers.length
      ? paidUnlockingTiers.map((t) => t.name)
      : [];

  let needsUpgrade =
    viewer.membership?.kind === "paid" &&
    !membershipUnlocksGatedPost(viewer.membership, gatePolicy);

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
          {needsUpgrade
            ? "Upgrade your membership to continue reading"
            : subscriptionUnlocks
              ? "Subscribe to continue reading"
              : "Become a member to continue reading"}
        </h3>
        {subscriptionUnlocks ? (
          <p>Free for subscribers</p>
        ) : (
          startingPriceCents !== null && (
            <p>
              {needsUpgrade && namedTiers.length > 0
                ? `Available starting from ${formatPrice(startingPriceCents)}/month`
                : `Memberships start at ${formatPrice(startingPriceCents)}/month`}
            </p>
          )
        )}
      </div>
      {needsUpgrade ? (
        <div className="flex flex-col gap-1 items-center justify-center">
          <ButtonPrimary
            type="button"
            className="pubPageUpgrade"
            disabled={!membership}
            onClick={() => setChangingPlan(true)}
          >
            Upgrade
          </ButtonPrimary>
          {changingPlan && membership && (
            <ChangePlanModal
              membership={membership}
              title="Upgrade your membership"
              gatePolicy={gatePolicy}
              onSuccess={revalidateUnlocks}
              onClose={() => setChangingPlan(false)}
            />
          )}
          <ManageSubscription
            publicationUri={pub.uri}
            newsletterMode={pub.newsletterMode}
            user={viewer}
            triggerLabel="Manage Subscription"
            membershipTiers={membershipTiers}
          />
        </div>
      ) : (
        <PaidSubscribeButton
          publicationUri={pub.uri}
          publicationName={pub.name}
          source={{ placement: "paywall" }}
          newsletterMode={pub.newsletterMode}
          tiers={membershipTiers}
          gatePolicy={gatePolicy}
        />
      )}
    </div>
  );
};
