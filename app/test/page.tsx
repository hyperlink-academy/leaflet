"use client";

import { useState } from "react";
import { IdentityContext, type Identity } from "components/IdentityProvider";
import {
  SubscribeButton,
  SubscribeInput,
  type SubscribeProps,
} from "components/Subscribe/SubscribeButton";
import { ButtonSecondary } from "components/Buttons";

// A fake publication the viewer is NOT subscribed to, so the subscribe
// affordances (rather than ManageSubscription) render.
const PUBLICATION_URI = "at://did:plc:example/pub.leaflet.publication/test";
const PUBLICATION_URL = "https://example.leaflet.pub";

const baseProps: Omit<SubscribeProps, "newsletterMode" | "compact"> = {
  publicationUri: PUBLICATION_URI,
  publicationUrl: PUBLICATION_URL,
  publicationName: "Test Publication",
  publicationDescription: "A publication for previewing subscribe variants.",
};

// Logged-in viewer with both an email and a Bluesky handle, so the one-click
// EmailButton / SubscribeWithHandle variants render. Cast through unknown: the
// components only read a handful of fields off the identity.
const loggedInIdentity = {
  atp_did: "did:plc:example",
  email: "reader@example.com",
  bsky_profiles: { handle: "reader.bsky.social" },
  publication_subscriptions: [],
  publication_email_subscribers: [],
} as unknown as Identity;

// Wraps children in a mock IdentityContext so we can preview the logged-in vs
// logged-out branches without real auth.
function MockIdentity(props: { loggedIn: boolean; children: React.ReactNode }) {
  return (
    <IdentityContext.Provider
      value={{
        identity: props.loggedIn ? loggedInIdentity : null,
        mutate: (async () => (props.loggedIn ? loggedInIdentity : null)) as any,
      }}
    >
      {props.children}
    </IdentityContext.Provider>
  );
}

function Cell(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border border-border-light rounded-lg p-3 w-full min-w-0">
      <div className="text-tertiary text-sm font-bold">{props.label}</div>
      {props.children}
    </div>
  );
}

function VariantGrid(props: {
  compact: boolean;
  render: (cellProps: SubscribeProps) => React.ReactNode;
}) {
  const variants: {
    label: string;
    newsletterMode: boolean;
    loggedIn: boolean;
  }[] = [
    {
      label: "Newsletter ON · Logged out",
      newsletterMode: true,
      loggedIn: false,
    },
    {
      label: "Newsletter ON · Logged in",
      newsletterMode: true,
      loggedIn: true,
    },
    {
      label: "Newsletter OFF · Logged out",
      newsletterMode: false,
      loggedIn: false,
    },
    {
      label: "Newsletter OFF · Logged in",
      newsletterMode: false,
      loggedIn: true,
    },
  ];
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {variants.map((v) => (
        <Cell key={v.label} label={v.label}>
          <MockIdentity loggedIn={v.loggedIn}>
            {props.render({
              ...baseProps,
              newsletterMode: v.newsletterMode,
              compact: props.compact,
            })}
          </MockIdentity>
        </Cell>
      ))}
    </div>
  );
}

function Section(props: {
  title: string;
  render: (cellProps: SubscribeProps) => React.ReactNode;
}) {
  const [compact, setCompact] = useState(false);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2>{props.title}</h2>
        <ButtonSecondary compact onClick={() => setCompact((c) => !c)}>
          compact: {compact ? "on" : "off"}
        </ButtonSecondary>
      </div>
      <VariantGrid compact={compact} render={props.render} />
    </section>
  );
}

export default function TestPage() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8 p-6">
      <h1>Subscribe Variants</h1>

      <Section
        title="SubscribeButton"
        render={(p) => <SubscribeButton {...p} />}
      />

      <Section
        title="SubscribeInput"
        render={(p) => <SubscribeInput {...p} />}
      />
    </div>
  );
}
