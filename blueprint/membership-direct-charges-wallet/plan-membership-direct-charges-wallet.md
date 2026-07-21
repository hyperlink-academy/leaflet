# Membership billing: direct charges + platform wallet

## Overview

- Switch paid-membership billing from destination charges (platform account) to **direct charges on the publisher's connected account**. The publisher becomes merchant of record; subscriptions, customers, products, and prices all live on their Stripe account — maximally portable if a publisher ever leaves.
- Direct charges only need the `merchant`/`card_payments` capability the connect flow already requests — no `recipient` configuration, no transfers capability, no backfill. The `charges_enabled` gates become exactly correct.
- Add a **platform wallet**: one platform Customer per reader (reusing the Leaflet Pro customer when it exists) holding a card saved via SetupIntent (`usage: off_session`). For each join, the card is **cloned** to the publisher's account (`paymentMethods.create({ customer, payment_method }, { stripeAccount })`) and a subscription is created server-side — Substack-style, no Stripe-hosted checkout.
- First-time card collection is an **embedded Payment Element** step on the `/join` page (platform SetupIntent). Repeat readers get one-click "Join with Visa ···4242". Subscriptions are created `default_incomplete` and confirmed client-side so 3DS challenges and declines resolve inline.
- Platform fee stays `application_fee_percent` (`PLATFORM_FEE_BPS` = 5%), now on a direct-charge subscription.
- Readers manage everything (cancel/resume, tier/cadence switch, card update) in native Leaflet UI backed by `stripeAccount`-scoped API calls — no Stripe billing portal for memberships.
- Scope guards: US publishers + USD only; no trials/coupons; existing platform-side test data is cleared manually (no migration code); Leaflet Pro billing untouched.

## Expected behavior

### Joining (reader)
- On `/join`, the Subscribe→join handoff is unchanged: free subscription happens first (`subscribeToPublication` already routes to `/join` when memberships are enabled), and a paying member is always a subscriber. Membership lapse does not remove the free subscription.
- Reader must be logged in (existing behavior) and must have an email on file; if missing, the join flow prompts to add one before payment.
- No saved wallet card: clicking **Join** on a tier advances to a second step on `/join` — tier locked in, full-width Payment Element form. Confirming saves the card to the reader's platform customer, then creates the membership subscription on the publisher's account.
- Saved wallet card: the tier shows **Join · $N/mo with ···4242** — one click creates the subscription; a 3DS challenge or decline surfaces inline on the same page (client-side confirmation of the `default_incomplete` subscription's first invoice).
- Membership activates when the first payment succeeds; the reader gains members-only access immediately (webhook + optimistic client update on confirmed payment).
- Publisher owner and existing members see the same states as today (own-publication notice, "already a member").

### Managing (reader)
- New central **Memberships & billing** page on leaflet.pub: lists all memberships (publication, tier, price/cadence, status, renewal date) plus the wallet card.
- Cancel (at period end), resume, switch tier, switch monthly↔annual — all native UI; switches use Stripe's default proration.
- Updating the wallet card re-clones the new card to every active membership's connected account and swaps it as the subscription's payment method.
- A failed renewal emails the reader a link to the update-card flow. No grace period: members-only access ends the moment a renewal fails (current `isActiveMembership` behavior); Stripe retries then auto-cancels.

### Publishing (publisher)
- Tier create/edit now provisions products/prices **on the publisher's connected account**; publishers see all membership activity (customers, subscriptions, payouts, disputes) in their own full Stripe dashboard.
- Checkout charges wear the publisher's Stripe branding/statement descriptor; the publisher pays Stripe processing + Billing fees; Leaflet's 5% arrives as application fees.
- Subscribers dashboard (`dashboard/subs`) tags rows that are paying members (tier name badge) with a "Members" filter — no separate members view.
- Publisher gets an in-app notification when a new member joins.
- Disabling memberships is disallowed for now (button removed/guarded); tier soft-delete behavior unchanged.

## Implementation plan

### Dependencies & config
- Add `@stripe/stripe-js` + `@stripe/react-stripe-js`; new env `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- New env `STRIPE_CONNECT_EVENTS_WEBHOOK_SECRET` for the connected-account events endpoint (distinct from the existing v2 account-status webhook secret).

### Database (new migration in `supabase/migrations/`, then `npm run generate-db-types`)
- New table `stripe_wallets`: `identity_id` (PK, FK identities), `stripe_customer_id`, `default_payment_method_id`, `card_brand`, `card_last4`, `card_exp_month`, `card_exp_year`, timestamps. One row per reader; customer id is the shared platform customer.
- New table `stripe_connected_customers`: `(identity_id, stripe_account_id)` PK, `stripe_customer_id`. Reuses one connected-account customer per reader across a publisher's publications.
- `publication_memberships`: add `stripe_account_id` (the account the subscription lives on — never re-derive from the current owner), `cadence` (`month`/`year`), `stripe_price_id`. Existing columns unchanged.

### Stripe helpers (`stripe/`)
- `stripe/connect.ts`: delete unused `platformFeeAmount`; update the destination-charge comments. Account creation and onboarding link unchanged (merchant/`card_payments` is all direct charges need).
- New `stripe/wallet.ts`:
  - `getOrCreateWallet(identity)` — reuse `user_subscriptions.stripe_customer_id` (or any prior wallet) else `customers.create`; upsert `stripe_wallets`.
  - `saveWalletCard(identityId, paymentMethodId)` — attach to platform customer, set as wallet default, store card display fields.
  - `cloneCardToAccount(walletPmId, platformCustomerId, stripeAccount)` — the clone call; returns connected-account PM id.
  - `getOrCreateConnectedCustomer(identity, stripeAccount)` — lookup `stripe_connected_customers`, else `customers.create` with `{stripeAccount}` + attach cloned PM.

### Server actions (`actions/publications/`)
- `membershipSettings.ts` (`upsertMembershipTier`, `deleteMembershipTier`): pass `{ stripeAccount: ownerAccountId }` on every product/price call; drop the "prices live on the platform account" comments. Idempotency keys unchanged. `disableMemberships`: return `Err("unsupported")` and remove its UI entry point.
- Replace `startMembershipCheckout.ts` with `joinMembership.ts` exposing:
  - `createWalletSetupIntent()` — `getOrCreateWallet` + `setupIntents.create({ customer, usage: "off_session", payment_method_types: ["card"] })`; returns client secret (card-only so everything saved is clonable).
  - `subscribeToTier({ publicationUri, tierId, cadence })` — validates like today (enabled, not owner, tier active, `charges_enabled`, not already member, email on file), then: clone wallet card → connected customer → `subscriptions.create` with `{stripeAccount}`: price, `application_fee_percent`, `default_payment_method`, `payment_behavior: "default_incomplete"`, `payment_settings.save_default_payment_method: "off"`, membership `metadata` (kind/publication/tier/identity), expand first invoice's payment intent. Upserts the `publication_memberships` row (`status: "incomplete"`, account id, cadence, price id). Returns `{ status, clientSecret?, stripeAccountId }` for client confirmation.
- New `actions/memberships.ts` (reader management, all resolve the subscription via the stored `stripe_account_id` and verify the membership row belongs to the caller):
  - `cancelMembership` / `resumeMembership` — `subscriptions.update({ cancel_at_period_end })`.
  - `switchMembership({ tierId, cadence })` — swap the single subscription item to the new price, default proration; update row's tier/cadence/price.
  - `updateWalletCard(setupIntentId)` — `saveWalletCard`, then for each active membership: clone to that account, attach, `subscriptions.update({ default_payment_method })`. Best-effort per membership; report failures.
  - `getMyMemberships` — rows joined with publication name/URL + tier for the central page.

### Webhooks (`app/api/webhooks/stripe/`)
- New route `connect-events/route.ts`: v1-style `constructEvent` with the new secret; Stripe dashboard endpoint configured to "listen on connected accounts". Handles (filtered to `metadata.kind === "publication_membership"`, using `event.account` for follow-up calls):
  - `customer.subscription.created/updated/deleted` → update `publication_memberships` (status, period end, `cancel_at_period_end`); on first transition to `active`, insert the publisher's `new_member` notification.
  - `invoice.payment_succeeded` → same refresh (activation path for the first invoice).
  - `invoice.payment_failed` → set status, send failed-payment email via Postmark.
- Existing platform `route.ts` + handlers: remove the `publication_membership` branches from `handle_checkout_completed.ts` and `handle_subscription_updated.ts` (memberships no longer occur on the platform account); Leaflet Pro paths untouched.
- Existing `connect/route.ts` (v2 account status) unchanged.

### Join page UI (`app/(app)/lish/[did]/[publication]/join/`)
- `page.tsx`: also load the viewer's wallet card + email presence.
- `JoinTiers.tsx`: rework into a two-step flow.
  - Step 1: tier cards as today. Saved card ⇒ button reads "Join · price with ···last4" and calls `subscribeToTier` directly, handling `requires_action` via `stripe.confirmPayment`-style confirmation (Stripe.js initialized with the publisher's `stripeAccount` for the connected-account PaymentIntent).
  - Step 2 (no saved card): tier locked in, full-width form — email prompt (if missing) then Payment Element bound to the wallet SetupIntent; on confirm, `updateWalletCard`-less path: `saveWalletCard` via `subscribeToTier` (which reads the fresh wallet default) and the same confirmation handling.
  - Success: refresh membership state; redirect/return behavior per open question below (default: back to `returnUrl` as today).
- New small client util `src/stripeClient.ts`: memoized `loadStripe` for the platform key and per-`stripeAccount` instances.

### Reader management UI (new)
- New route on leaflet.pub, e.g. `app/(app)/(home-pages)/(writer)/memberships/page.tsx` — "Memberships & billing": membership list (cancel/resume/switch controls) + wallet card display with "Update card" (Payment Element in a modal, then `updateWalletCard`). Linked from home layout nav and from `/join` when already a member.

### Publisher surfaces
- `dashboard/subs`: server loader joins active `publication_memberships` (+ tier name); `MergedSubscriber` gains `memberTier?: string`; `SubscriberListItem` renders a member badge; `SubscriberStatusFilter` gains a "Members" checkbox (`dashboardState`).
- `src/notifications.ts`: add `{ type: "new_member"; publication: string; membership_id: string }` to the union + renderer in the notifications UI.
- `emails/`: new `membershipPaymentFailed.tsx` react-email template; sent through the existing Postmark fetch pattern (`src/utils/confirmationEmail.ts` style) with a link to the update-card flow.
- `MembershipSettings.tsx`: remove the disable toggle; add a note/link that member payments appear in the publisher's Stripe dashboard.

### Removals / cleanup
- Manual (owner does it): delete platform-side test products/prices/subscriptions; null out `stripe_*` ids on `publication_membership_tiers`; clear test `publication_memberships` rows; re-save tiers to provision on connected accounts.

## Implementation phases

1. **Foundation** — deps, env vars, DB migration + regenerated types, `stripe/wallet.ts` helpers, tier sync moved to connected accounts (`membershipSettings.ts`), delete `startMembershipCheckout.ts` + platform-webhook membership branches, guard `disableMemberships`. System works: publishers provision tiers on their own accounts; joining is temporarily unavailable.
2. **Subscribe backend + webhooks** — `joinMembership.ts` actions, `connect-events` webhook route + handlers, `new_member` notification, failed-payment email. Verifiable end-to-end via a scripted call before UI exists.
3. **Join page UI** — two-step `JoinTiers` with Payment Element, one-click saved-card path, email prompt, client-side confirmation of 3DS/declines. Readers can join again.
4. **Reader management** — Memberships & billing page: list, cancel/resume, tier/cadence switch, update card with re-clone propagation.
5. **Publisher polish** — subscribers-dashboard member tags + filter, notification renderer, settings copy. 

## Testing strategy

- `npx tsc` after each phase (CI check).
- **Stripe test mode, end-to-end** with `stripe listen` forwarding both webhook endpoints; a test connected account onboarded via the existing flow:
  - First join: card `4242…` — wallet row created, PM cloned, subscription `active` on the connected account, membership row active, members-only post unlocks, publisher notification fires, application fee visible on the platform.
  - One-click join to a second publication from the same reader — no card entry; connected customer created on the second account.
  - 3DS card (`4000 0025 0000 3155`) — inline challenge on `/join`, membership activates after completion; abandoned challenge leaves `incomplete` (row stays inactive, Stripe expires it — verify the webhook cleans status).
  - Decline card (`4000 0000 0000 0002`) — inline error, no membership.
  - Renewal failure: attach a failing card via `updateWalletCard`, advance the subscription clock (test clocks) — status flips, access cut, Postmark email sent.
  - Cancel/resume, tier switch, cadence switch — proration invoice on the connected account, row fields update via webhook.
  - Card update — new PM swapped on every active membership's subscription.
- **Edge cases**: reader with no email (prompted before payment); atproto-only identity; own publication; already-member; tier deactivated mid-flow (`subscribeToTier` re-validates); publisher with `charges_enabled` false; duplicate `subscribeToTier` submits (idempotency key on subscription create keyed to membership row); webhook replay (handlers idempotent — upserts keyed on subscription id).
- Existing manual harness pattern (`tests-subscribe` skill) can be extended for JoinTiers states if useful.

## Open questions

- **Post-join landing**: redirect straight back to `returnUrl` (matches today) vs. a brief success state on `/join`. Default assumption: redirect as today.
- **Comped memberships** (publisher grants free access, no Stripe subscription): not designed in; if wanted, affects `isActiveMembership` and the members tagging. Default assumption: not in this plan.
- **Leaflet Pro + wallet**: Pro stays on hosted Checkout and only shares the platform Customer. Should a Pro checkout eventually reuse the wallet card? Out of scope here.
- Whether `subscribeToTier` should also handle an existing `incomplete` membership row (reader retries after abandoning 3DS) by resuming vs. recreating the subscription — plan assumes cancel-and-recreate for simplicity.
- Exact placement/naming of the central page (`/memberships` under the writer home layout) — adjust to whatever account-level nav exists when building.
