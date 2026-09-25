"use client";
import { useState } from "react";
import { notFound } from "next/navigation";
import { SWRConfig } from "swr";
import {
  IdentityContextProvider,
  type Identity,
} from "components/IdentityProvider";
import {
  SubscribeButton,
  SubscribeInput,
  type SubscribeProps,
} from "components/Subscribe/SubscribeButton";

const PUBLICATION_URI = "at://did:plc:example/pub.leaflet.publication/test";
const PUBLICATION_URL = "https://example.leaflet.pub";

const baseProps: Omit<SubscribeProps, "newsletterMode"> = {
  publicationUri: PUBLICATION_URI,
  publicationUrl: PUBLICATION_URL,
  publicationName: "Test Publication",
  publicationDescription:
    "A publication for previewing the subscribe affordances.",
};

type Render = (p: SubscribeProps) => React.ReactNode;

// Build a logged-in identity the viewer is NOT subscribed to. The handle lives
// on bsky_profiles (and implies an atp_did); the email is independent, so an
// email-only account has no handle/atp_did.
function makeIdentity(opts: {
  hasHandle: boolean;
  hasEmail: boolean;
  subscribed?: boolean;
}): Identity {
  const profile = { did: "did:plc:example", handle: "reader.bsky.social" };
  return {
    atp_did: opts.hasHandle ? profile.did : null,
    email: opts.hasEmail ? "reader@example.com" : null,
    bsky_profiles: opts.hasHandle ? { ...profile, record: profile } : null,
    // An atproto subscription implies an atproto account — gate on the handle
    // so the unified `subscribed` derivation sees a coherent identity.
    publication_subscriptions:
      opts.subscribed && opts.hasHandle
        ? [{ publication: PUBLICATION_URI }]
        : [],
    publication_email_subscribers:
      opts.subscribed && opts.hasEmail
        ? [{ publication: PUBLICATION_URI, state: "confirmed" }]
        : [],
  } as unknown as Identity;
}

// The identity context isn't exported, so the mock goes in through the real
// provider — seeded, never fetching. Each cell gets its own SWR cache so the
// cells' identities don't fight over the shared "identity" key, and remounts
// when the mock changes (a provider cache is built once per SWRConfig).
function MockIdentity(props: {
  identity: Identity;
  children: React.ReactNode;
}) {
  return (
    <SWRConfig
      key={JSON.stringify(props.identity)}
      value={{ provider: () => new Map() }}
    >
      <IdentityContextProvider initialValue={props.identity}>
        {props.children}
      </IdentityContextProvider>
    </SWRConfig>
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

function Cell(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-md p-3 flex flex-col gap-2">
      <div className="text-tertiary text-sm">{props.label}</div>
      {props.children}
    </div>
  );
}

// One cell per newsletterMode, all sharing the same mocked identity.
function NewsletterGrid(props: { identity: Identity; render: Render }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {[true, false].map((newsletterMode) => (
        <MockIdentity key={String(newsletterMode)} identity={props.identity}>
          <Cell label={`newsletter: ${newsletterMode ? "on" : "off"}`}>
            {props.render({ ...baseProps, newsletterMode })}
          </Cell>
        </MockIdentity>
      ))}
    </div>
  );
}

function LoggedInSubsection(props: { render: Render }) {
  let [hasEmail, setHasEmail] = useState(true);
  let [hasHandle, setHasHandle] = useState(true);
  let [subscribed, setSubscribed] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4 flex-wrap">
        <h3 className="grow">Logged in</h3>
        <Checkbox label="has email" checked={hasEmail} onChange={setHasEmail} />
        <Checkbox
          label="has handle"
          checked={hasHandle}
          onChange={setHasHandle}
        />
        <Checkbox
          label="subscribed"
          checked={subscribed}
          onChange={setSubscribed}
        />
      </div>
      <NewsletterGrid
        identity={makeIdentity({ hasEmail, hasHandle, subscribed })}
        render={props.render}
      />
    </div>
  );
}

function LoggedOutSubsection(props: { render: Render }) {
  return (
    <div className="flex flex-col gap-2">
      <h3>Logged out</h3>
      <NewsletterGrid identity={null} render={props.render} />
    </div>
  );
}

function ComponentSection(props: { title: string; render: Render }) {
  return (
    <div className="flex flex-col gap-4">
      <h2>{props.title}</h2>
      <LoggedInSubsection render={props.render} />
      <LoggedOutSubsection render={props.render} />
    </div>
  );
}

export default function SubscribePreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-10 p-6">
      <h1>Subscribe Variants</h1>
      <ComponentSection
        title="Subscribe Button"
        render={(p) => <SubscribeButton {...p} />}
      />
      <ComponentSection
        title="Subscribe Input"
        render={(p) => <SubscribeInput {...p} />}
      />
    </div>
  );
}
