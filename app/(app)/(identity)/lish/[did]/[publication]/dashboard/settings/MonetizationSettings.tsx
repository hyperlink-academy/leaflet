"use client";
import { useState } from "react";
import {
  ButtonPrimary,
  ButtonSecondary,
  ButtonTertiary,
} from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { Modal } from "components/Modal";
import { Input } from "components/Input";
import { useIdentityData } from "components/IdentityProvider";
import { useToaster } from "components/Toast";
import { usePublicationData } from "../PublicationSWRProvider";
import { SettingsSection } from "components/SettingsLayout";
import { ConnectPayments } from "components/StripeConnect/ConnectPayments";
import {
  enableMemberships,
  disableMemberships,
  upsertMembershipTier,
  deleteMembershipTier,
  type MembershipTierInput,
} from "actions/publications/membershipSettings";
import { formatPrice } from "components/Memberships/TierGrid";
import { char } from "drizzle-orm/pg-core";
import { MembershipTiers } from "./MemberTierSettings";

export const MonetizationSettings = () => {
  let { data } = usePublicationData();
  let { identity } = useIdentityData();

  let publicationUri = data?.publication?.uri;
  let monetizationEnabled =
    data?.publication?.publication_membership_settings?.enabled;
  let stripeEnabled = !!identity?.connectedAccount?.charges_enabled;

  if (!publicationUri) return null;

  return (
    <>
      <SettingsSection
        title={stripeEnabled ? "Payments Enabled" : "Enable Payments"}
      >
        <div className="flex flex-col gap-2 text-secondary">
          {stripeEnabled ? (
            <>
              <div>
                This publication can accept payments from readers with Stripe.
                <br /> You can manage and withdraw funds, and find information
                on subscriptions, customers, and disputes via the Stripe
                Dashboard.
              </div>
              <div>Leaflet collects 5% of all charges.</div>
            </>
          ) : (
            <>
              <div>
                Collect subscriptions and monetize your content!
                <br /> Connect a Stripe account to get started!
              </div>
              <div>Leaflet collects 5% of all charges.</div>
            </>
          )}
        </div>
        <ConnectPayments />
      </SettingsSection>
      {stripeEnabled &&
        (monetizationEnabled ? (
          <MembershipTiers publicationUri={publicationUri} />
        ) : (
          <EnableMonetization publicationUri={publicationUri} />
        ))}
    </>
  );
};

const EnableMonetization = (props: { publicationUri: string }) => {
  let { mutate } = usePublicationData();
  let toaster = useToaster();
  let [enabling, setEnabling] = useState(false);

  return (
    <SettingsSection
      accent
      title="Enable Paid Memberships"
      className="text-center"
    >
      <div className="leading-snug text-secondary">
        You've connected a Stripe account! <br />
        Turn on paid memberships for this publication to <br /> create
        membership tiers and start collecting payments!
      </div>
      <ButtonPrimary
        type="button"
        className="mx-auto"
        disabled={enabling}
        onClick={async () => {
          if (enabling) return;
          setEnabling(true);
          let res = await enableMemberships(props.publicationUri);
          setEnabling(false);
          if (!res.ok) {
            toaster({
              type: "error",
              content:
                res.error === "no_connected_account"
                  ? "Set up payments first to enable monetization."
                  : "Failed to enable monetization.",
            });
            return;
          }
          toaster({ type: "success", content: "Monetization enabled!" });
          await mutate();
        }}
      >
        {enabling ? <DotLoader /> : "Enable!"}
      </ButtonPrimary>
    </SettingsSection>
  );
};
