"use client";
import { useState } from "react";
import { ButtonPrimary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { useIdentityData } from "components/IdentityProvider";
import { useToaster } from "components/Toast";
import { usePublicationData } from "../PublicationSWRProvider";
import { SettingsSection } from "components/SettingsLayout";
import { ConnectPayments } from "components/StripeConnect/ConnectPayments";
import { enableMemberships } from "actions/publications/membershipSettings";
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
      <ConnectStripeSection />
      {stripeEnabled &&
        (monetizationEnabled ? (
          <MembershipTiers publicationUri={publicationUri} />
        ) : (
          <EnableMonetization publicationUri={publicationUri} />
        ))}
    </>
  );
};

export const ConnectStripeSection = () => {
  let { identity } = useIdentityData();

  let stripeEnabled = !!identity?.connectedAccount?.charges_enabled;

  return (
    <SettingsSection
      title={stripeEnabled ? "Payments Enabled" : "Enable Payments"}
    >
      <div className="flex flex-col gap-2 text-secondary">
        {stripeEnabled ? (
          <>
            <div className="font-bold">
              {" "}
              You can accept payments from readers with Stripe!
            </div>
            <div>
              Manage and withdraw funds, and find information on subscriptions,
              customers, and disputes via the Stripe Dashboard.
            </div>
            <div>
              Leaflet collects 5% of all charges, after processing fees.
            </div>
          </>
        ) : (
          <>
            <div>
              Collect subscriptions and monetize your content!
              <br /> Connect a Stripe account to get started!
            </div>
            <div>
              Leaflet collects 5% of all charges, after processing fees.
            </div>
          </>
        )}
      </div>
      <ConnectPayments />
    </SettingsSection>
  );
};

const EnableMonetization = (props: { publicationUri: string }) => {
  let { mutate } = usePublicationData();
  let toaster = useToaster();
  let [enabling, setEnabling] = useState(false);

  return (
    <SettingsSection accent title="Set Up Paid Memberships">
      <div className="leading-snug text-secondary">
        You've connected a Stripe account! <br />
        Turn on paid memberships for this publication to <br /> create
        membership tiers and start collecting payments!
      </div>
      <ButtonPrimary
        type="button"
        className=""
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
        {enabling ? <DotLoader /> : "Turn on Memberships!"}
      </ButtonPrimary>
    </SettingsSection>
  );
};
