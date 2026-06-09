---
name: tests-subscribe
description: Generate a manual preview/test harness page for the Subscribe button components. Use when you want to visually preview SubscribeButton / SubscribeInput across logged-in/out and newsletter-mode variants, with checkboxes for whether the viewer has an email / atproto handle.
user-invocable: true
---

# Subscribe Button Test Harness

Scaffolds a client-side preview page that renders the `SubscribeButton` and
`SubscribeInput` components behind a mocked `IdentityContext`, so the subscribe
affordances can be eyeballed without real auth.

## What to produce

Create `app/test/subscribe/page.tsx` (a folder called `subscribe` under
`app/test/`) with the exact contents in **Reference implementation** below.
The page is a self-contained `"use client"` component — no routing or data
fetching required. Visit it at `/test/subscribe`.

If the file already exists, overwrite it so it matches the reference verbatim.

## Structure

The page is organized by component, then by auth state:

- **Subscribe Button**
  - **Logged in** — `has email` / `has handle` checkboxes; renders a cell for
    newsletter on and off
  - **Logged out** — newsletter on/off cells
- **Subscribe Input**
  - **Logged in** — `has email` / `has handle` checkboxes; newsletter on/off cells
  - **Logged out** — newsletter on/off cells

## Source components

- `components/Subscribe/SubscribeButton` exports `SubscribeButton`,
  `SubscribeInput`, and the `SubscribeProps` type.
- `components/IdentityProvider` exports `IdentityContext` and the `Identity` type.

`SubscribeProps` is keyed on `publicationUri`, `publicationUrl`,
`publicationName`, `publicationDescription`, and `newsletterMode: boolean`
(toggles the email-newsletter affordance).

When the viewer is **not** subscribed the subscribe affordances render; when
subscribed `ManageSubscription` renders instead — so the mocked identity uses
empty `publication_subscriptions` / `publication_email_subscribers`.

## How the mock works

`makeIdentity({ hasHandle, hasEmail })` builds a logged-in `Identity` the viewer
is not subscribed to. The handle lives on `bsky_profiles.handle` and implies an
`atp_did`; the email is independent, so an email-only account has no
handle/`atp_did`. Cast through `unknown as Identity` — the components only read a
few fields. `MockIdentity` provides `IdentityContext` with that identity (or
`null` when logged out) plus a no-op `mutate`. The `has email` / `has handle`
checkboxes in each logged-in subsection rebuild the identity.

## Reference implementation

Write `app/test/subscribe/page.tsx` with exactly this:

```tsx
"use client";
import { useState } from "react";
import { IdentityContext, type Identity } from "components/IdentityProvider";
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
function makeIdentity(opts: { hasHandle: boolean; hasEmail: boolean }): Identity {
  return {
    atp_did: opts.hasHandle ? "did:plc:example" : null,
    email: opts.hasEmail ? "reader@example.com" : null,
    bsky_profiles: opts.hasHandle ? { handle: "reader.bsky.social" } : null,
    publication_subscriptions: [],
    publication_email_subscribers: [],
  } as unknown as Identity;
}

function MockIdentity(props: {
  identity: Identity;
  children: React.ReactNode;
}) {
  return (
    <IdentityContext.Provider
      value={{ identity: props.identity, mutate: (async () => props.identity) as any }}
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
      </div>
      <NewsletterGrid
        identity={makeIdentity({ hasEmail, hasHandle })}
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
```
