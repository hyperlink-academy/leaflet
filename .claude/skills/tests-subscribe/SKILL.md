---
name: tests-subscribe
description: Generate a manual preview/test harness page for the Subscribe button components. Use when you want to visually preview SubscribeButton / SubscribeInput across newsletter-mode, logged-in/out, and compact variants.
user-invocable: true
---

# Subscribe Button Test Harness

Scaffolds a client-side preview page that renders every `SubscribeButton` /
`SubscribeInput` variant in a grid, behind a mocked `IdentityContext`, so the
subscribe affordances can be eyeballed without real auth.

## What to produce

Create `app/test/subscribe/page.tsx` (a folder called `subscribe` under
`app/test/`). The page is a self-contained `"use client"` component — no routing
or data fetching required. Visit it at `/test/subscribe`.

## Source components

- `components/Subscribe/SubscribeButton` exports `SubscribeButton`,
  `SubscribeInput`, and the `SubscribeProps` type.
- `components/IdentityProvider` exports `IdentityContext` and the `Identity` type.
- `components/Buttons` exports `ButtonSecondary` (used for the compact toggle).

`SubscribeProps` is keyed on:
- `publicationUri`, `publicationUrl`, `publicationName`, `publicationDescription`
- `newsletterMode: boolean` — toggles the email-newsletter affordance
- `compact: boolean` — dense layout

When the viewer is **not** subscribed, the subscribe affordances render; when
subscribed, `ManageSubscription` renders instead — so the mock identity must use
empty `publication_subscriptions` / `publication_email_subscribers`.

## Recipe

1. **Fixtures** — a fake publication the viewer is NOT subscribed to:
   - `PUBLICATION_URI = "at://did:plc:example/pub.leaflet.publication/test"`
   - `PUBLICATION_URL = "https://example.leaflet.pub"`
   - `baseProps`: `Omit<SubscribeProps, "newsletterMode" | "compact">` with the
     uri/url/name/description above.

2. **Mock identity** — a logged-in `Identity` with both `email` and a
   `bsky_profiles.handle` so the one-click `EmailButton` / `SubscribeWithHandle`
   variants render. Cast through `unknown as Identity`; the components only read
   a few fields:
   ```ts
   const loggedInIdentity = {
     atp_did: "did:plc:example",
     email: "reader@example.com",
     bsky_profiles: { handle: "reader.bsky.social" },
     publication_subscriptions: [],
     publication_email_subscribers: [],
   } as unknown as Identity;
   ```

3. **`MockIdentity`** wrapper — provides `IdentityContext` with `identity` set to
   `loggedInIdentity` or `null` based on a `loggedIn` prop, plus a no-op `mutate`.

4. **Layout helpers**:
   - `Cell({ label, children })` — bordered card with a label.
   - `VariantGrid({ compact, render })` — renders the 4 combinations of
     `newsletterMode` (on/off) × `loggedIn` (in/out) in a
     `grid sm:grid-cols-2 gap-3`, calling `render(cellProps)` per cell.
   - `Section({ title, render })` — a heading with a `compact: on/off` toggle
     (`ButtonSecondary compact`) over a `VariantGrid`.

5. **Page** — `max-w-3xl mx-auto flex flex-col gap-8 p-6`, an `<h1>Subscribe
   Variants</h1>`, then two `Section`s:
   - `"SubscribeButton"` → `(p) => <SubscribeButton {...p} />`
   - `"SubscribeInput"` → `(p) => <SubscribeInput {...p} />`

## Reference implementation

A working version of this harness already lives at `app/test/page.tsx` — copy it
into `app/test/subscribe/page.tsx` verbatim if you just want the page back.
