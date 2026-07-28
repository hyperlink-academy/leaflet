"use client";
import { useState } from "react";
import { IdentityContext, type Identity } from "components/IdentityProvider";
import { ToggleGroup } from "components/ToggleGroup";
import { PaidSubscribeButton } from "components/Subscribe/PaidSubscribeButton";
import type { Tier } from "components/Memberships/TierGrid";
import type { MembershipJoinViewer } from "actions/publications/joinMembership";

const PUBLICATION_URI = "at://did:plc:example/pub.leaflet.publication/test";
const PUBLICATION_URL = "https://example.leaflet.pub";

const TIERS: Tier[] = [
  {
    id: "tier-free",
    name: "Free",
    description: "Follow along with public posts.",
    monthly_price_cents: 0,
    annual_price_cents: null,
    is_free: true,
  },
  {
    id: "tier-supporter",
    name: "Supporter",
    description: "Unlock members-only posts.",
    monthly_price_cents: 500,
    annual_price_cents: 5000,
    is_free: false,
  },
  {
    id: "tier-patron",
    name: "Patron",
    description: "Everything, plus our undying gratitude.",
    monthly_price_cents: 1000,
    annual_price_cents: null,
    is_free: false,
  },
];

// Build a logged-in identity the viewer is NOT subscribed to, with both an
// email and a handle so either subscribe mode can one-click.
function makeIdentity(): Identity {
  return {
    atp_did: "did:plc:example",
    email: "reader@example.com",
    bsky_profiles: { handle: "reader.bsky.social" },
    publication_subscriptions: [],
    publication_email_subscribers: [],
    publication_memberships: [],
  } as unknown as Identity;
}

function MockIdentity(props: {
  identity: Identity | null;
  children: React.ReactNode;
}) {
  return (
    <IdentityContext.Provider
      value={{
        identity: props.identity,
        mutate: (async () => props.identity) as any,
      }}
    >
      {props.children}
    </IdentityContext.Provider>
  );
}

function Checkbox(props: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm text-secondary select-none">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      {props.label}
    </label>
  );
}

export default function PaidSubscribePreviewPage() {
  let [subscribeVia, setSubscribeVia] = useState<"email" | "handle">("email");
  let [loggedIn, setLoggedIn] = useState(false);
  let [hasCard, setHasCard] = useState(false);

  const identity = loggedIn ? makeIdentity() : null;
  const viewer: MembershipJoinViewer = {
    loggedIn,
    isOwner: false,
    membership: null,
    walletCard: loggedIn && hasCard ? { brand: "visa", last4: "4242" } : null,
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-6">
      <h1>Paid Subscribe Button</h1>
      <div className="flex items-center gap-4 flex-wrap justify-center">
        <ToggleGroup
          value={subscribeVia}
          onChange={setSubscribeVia}
          options={[
            { value: "email", label: "Email subscribe" },
            { value: "handle", label: "Handle subscribe" },
          ]}
        />
        <Checkbox label="logged in" checked={loggedIn} onChange={setLoggedIn} />
        <Checkbox
          label="card saved"
          checked={hasCard}
          onChange={setHasCard}
        />
      </div>
      <MockIdentity identity={identity}>
        <PaidSubscribeButton
          // Remount when a toggle flips so the modal's internal state resets.
          key={`${subscribeVia}-${loggedIn}-${hasCard}`}
          publicationUri={PUBLICATION_URI}
          publicationUrl={PUBLICATION_URL}
          publicationName="Test Publication"
          publicationDescription="A publication for previewing the paid subscribe flow."
          newsletterMode={subscribeVia === "email"}
          tiers={TIERS}
          viewerOverride={viewer}
        />
      </MockIdentity>
      <p className="text-tertiary text-sm max-w-md text-center">
        Tier clicks call the real server actions against a fake publication, so
        expect error toasts past the first step — this page is for eyeballing
        the modal states.
      </p>
    </div>
  );
}
