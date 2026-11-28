"use client";
import { useDocumentOptional } from "contexts/DocumentContext";
import { useState } from "react";
import { PaidSubscribeButton } from "components/Subscribe/PaidSubscribeButton";
import { ManageSubscription } from "components/Subscribe/ManageSubscribe";
import { useViewerSubscription } from "components/Subscribe/viewerSubscription";
import { ButtonPrimary } from "components/Buttons";
import { PubIcon } from "components/ActionBar/Publications";
import { formatPrice } from "components/Memberships/TierGrid";
import type { CtaDefaults } from "src/publicationDefaults";
import { useMyMembership } from "components/Memberships/useMyMembership";
import { revalidateUnlocks } from "components/Memberships/revalidateUnlocks";
import {
  daysUntilLabel,
  membershipUnlocksGatedPost,
  widerReleaseAudience,
  widerReleaseReaches,
  type GatePolicy,
  type MembershipTiers,
  type ResolvedPublicationMembership,
  type WiderRelease,
} from "src/membership";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { AtUri } from "@atproto/syntax";
import { LoadingTiny } from "components/Icons/LoadingTiny";
import { useUnlockStatus } from "./PostDataProvider";
import { ChangePlanModal } from "components/Memberships/ChangePlanModal";
import { CtaDescription } from "components/Subscribe/CtaDescription";

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

  if (unlockStatus === "loading") return <MembersOnlyPaywallLoading />;

  let membershipTiers = document?.membersOnly?.tiers;
  if (!membershipTiers) return null;
  let gatePolicy = document?.membersOnly?.gatePolicy ?? null;
  let widerRelease = document?.membersOnly?.widerRelease ?? null;

  let copy = applyPaywallCta(
    membersOnlyPaywallCopy({
      membership: viewer.membership,
      gatePolicy,
      tiers: membershipTiers.paid,
      widerRelease,
    }),
    document?.cta,
  );

  return (
    <MembersOnlyPaywallCard
      iconSrc={
        pub?.record?.icon
          ? blobRefToSrc(pub.record.icon.ref, new AtUri(pub.uri).host)
          : undefined
      }
      pubName={pub?.record?.name}
      copy={copy}
      description={copy.description}
    >
      {copy.needsUpgrade ? (
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
              widerRelease={widerRelease}
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
          widerRelease={widerRelease}
          upgrade={copy.canUpgrade}
        />
      )}
    </MembersOnlyPaywallCard>
  );
};

export type MembersOnlyPaywallCopy = {
  heading: string;
  description?: string;
  subscribeConditions: string | null;
  needsUpgrade: boolean;
  canUpgrade: boolean;
  earlyAccess: boolean;
};

export function applyPaywallCta(
  copy: MembersOnlyPaywallCopy,
  cta: CtaDefaults | undefined,
): MembersOnlyPaywallCopy {
  let text = copy.earlyAccess ? cta?.earlyAccess : cta?.locked;
  let upgrading = copy.needsUpgrade || copy.canUpgrade;
  return {
    ...copy,
    heading: (upgrading ? text?.upgradeHeader : text?.header) || copy.heading,
    description: text?.description || copy.description,
  };
}

export function membersOnlyPaywallCopy(input: {
  membership: ResolvedPublicationMembership | null | undefined;
  gatePolicy: GatePolicy | null;
  tiers: MembershipTiers["paid"];
  widerRelease: WiderRelease | null | undefined;
  now?: number;
}): MembersOnlyPaywallCopy {
  let { membership, gatePolicy, tiers, widerRelease } = input;
  let needsUpgrade =
    membership?.kind === "paid" &&
    !membershipUnlocksGatedPost(membership, gatePolicy);
  let cheapest = cheapestUnlockingTier(tiers, gatePolicy);
  let canUpgrade = !!membership && !!cheapest;
  let upgradeNote = canUpgrade ? " Upgrade to read now!" : "";
  let upgrading = needsUpgrade || canUpgrade;

  if (widerReleaseReaches(membership, gatePolicy, widerRelease, input.now)) {
    let released = widerReleaseAudience(gatePolicy!, widerRelease.audience);
    let audience =
      released.audience === "public"
        ? "everyone"
        : released.audience === "subscribers"
          ? "subscribers"
          : cheapestUnlockingTier(tiers, released)?.name ?? "members";
    return {
      heading: upgrading
        ? "Upgrade for early access"
        : "Subscribe for early access",
      subscribeConditions: `This post unlocks for ${audience} in ${daysUntilLabel(widerRelease.at, input.now)}.${upgradeNote}`,
      needsUpgrade,
      canUpgrade,
      earlyAccess: true,
    };
  }

  return {
    heading: upgrading
      ? "Upgrade to continue reading"
      : "Subscribe to continue reading",
    subscribeConditions:
      gatePolicy?.audience === "subscribers"
        ? "Available to subscribers"
        : cheapest
          ? `Available starting from ${formatPrice(cheapest.monthly_price_cents)}/month.`
          : null,
    needsUpgrade,
    canUpgrade,
    earlyAccess: false,
  };
}

function cheapestUnlockingTier(
  tiers: MembershipTiers["paid"],
  policy: GatePolicy | null,
) {
  let unlocking = tiers.filter((tier) =>
    membershipUnlocksGatedPost({ kind: "paid", tierId: tier.id }, policy),
  );
  return unlocking.length
    ? unlocking.reduce((a, b) =>
        b.monthly_price_cents < a.monthly_price_cents ? b : a,
      )
    : null;
}

export const MembersOnlyPaywallLoading = () => (
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

export const MembersOnlyPaywallCard = (props: {
  iconSrc: string | undefined;
  pubName: string | undefined;
  copy: MembersOnlyPaywallCopy;
  className?: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div
    className={`membersOnlyPaywall light-container flex flex-col items-center gap-3 text-center block-border bg-bg-page px-4 py-4 my-4 sm:my-6 leading-snug ${props.className ?? ""}`}
  >
    <PubIcon icon={props.iconSrc} pubName={props.pubName} large />
    <div>
      <h3 className="leading-tight pb-1">{props.copy.heading}</h3>
      {props.description && <CtaDescription text={props.description} />}
      {props.copy.subscribeConditions && (
        <p
          className={
            props.description ? "text-sm text-tertiary italic mt-2 " : ""
          }
        >
          {props.copy.subscribeConditions}
        </p>
      )}
    </div>
    {props.children}
  </div>
);
