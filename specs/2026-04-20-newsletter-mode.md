# Newsletter Mode

**Status**: draft

## Goal

Let publication owners send posts as emails to subscribers. Newsletter mode is appview-specific config (not part of the AT-Proto publication record), so all state lives in Postgres.

## Data Model

Four new tables; two legacy tables (`subscribers_to_publications`, `email_subscriptions_to_entity`) are dropped.

### `publication_newsletter_settings` — per-publication config

Dedicated table rather than a `metadata` jsonb on `publications`: sender-email verification has a real lifecycle (enable → verify → rotate → revoke), and "list publications with newsletter enabled" is a query we'll want cheap once metering lands.

- `publication` (text, PK, FK → `publications.uri` ON DELETE CASCADE)
- `enabled` (boolean, default false)
- `reply_to_email` (text, nullable) — owner's address; reader replies go here. Kept separate from `identities.email` so a publisher can expose a dedicated address without leaking their login email.
- `reply_to_verified_at` (timestamptz, nullable) — set once the confirmation-code flow completes
- `created_at`, `updated_at`

Partial index on `enabled WHERE enabled` for ops/billing reconciliation.

### `publication_email_subscribers` — per-publication subscriber list

Email subscribers only. The Atmosphere/handle subscribe path continues to live in `publication_subscriptions` — the two flows are intentionally separate (a handle subscriber has no email). Cross-flow queries union the two tables.

Unsubscribes are soft: the row stays, state flips to `unsubscribed`, so re-subscribes are clean and history stays intact.

- `id` (uuid, PK)
- `publication` (text, FK → `publications.uri` ON DELETE CASCADE)
- `email` (text)
- `identity_id` (uuid, nullable, FK → `identities.id` ON DELETE SET NULL) — set if subscriber logged in at signup
- `state` — `pending` | `confirmed` | `unsubscribed`
- `confirmation_code` (text, nullable) — 6 uppercase hex chars, same format as `email_auth_tokens.confirmation_code`. Re-requesting overwrites; no expiry column for v1 (rate-limiting on the anon subscribe endpoint covers the abuse case). Reusing the login-flow format keeps `OneTimePasswordField` and template copy consistent.
- `unsubscribe_token` (uuid, unique) — opaque token for `List-Unsubscribe` URLs
- `created_at`, `confirmed_at`, `unsubscribed_at`

Indexes: `unique (publication, email)` (re-subscribe updates the existing row); partial index on `(publication) WHERE state = 'confirmed'` for send targeting; unique on `unsubscribe_token`.

### `publication_email_subscriber_events` — append-only event log

Full lifecycle log for debugging delivery, timeseries, and billing reconciliation. Timestamp columns on `publication_email_subscribers` are convenience caches derivable from this log.

- `id` (uuid, PK)
- `subscriber` (uuid, FK → `publication_email_subscribers.id` ON DELETE CASCADE)
- `publication` (text, FK → `publications.uri`) — denormalized for cheap per-pub queries
- `event_type`: `subscribe_requested` | `confirmation_sent` | `confirmed` | `unsubscribe_requested` | `resubscribed` | `post_sent` | `bounce` | `complaint`
- `occurred_at`
- `metadata` (jsonb, nullable) — e.g. `{ document: "at://…" }` on `post_sent`, `{ reason: "…" }` on `bounce`

Indexes: `(subscriber, occurred_at desc)` for per-subscriber timeline; `(publication, event_type, occurred_at desc)` for aggregates.

### `publication_post_sends` — per-post send record

One row per `(publication, document)`. Primary job is idempotency: the publish action `INSERT … ON CONFLICT DO NOTHING`s here before triggering a send, so republishing can't double-email. Secondary job is cheap dashboard counts.

- `publication`, `document` (PK, both FK ON DELETE CASCADE)
- `status` — `pending` | `sending` | `sent` | `failed`
- `subscriber_count` (int, nullable) — snapshot of confirmed subscribers at send time
- `started_at`, `completed_at` (nullable), `error` (text, nullable)

Index on `(publication, started_at desc)` for the dashboard's recent-sends list. Per-recipient detail (bounces, complaints) lives in the events log; this table is the post-level aggregate only.

### Authorization

RLS is enabled on all four tables as defense-in-depth, but effective authority lives at the server-action layer (same pattern as `publication_domains`). Every mutation goes through a server action that loads the caller via `getIdentityData()` and asserts ownership (owner ops) or rate-limits (anon ops). Public reads of `enabled` go through the `get_publication_data` RPC, which projects only public columns; `reply_to_email` and verification state are never returned to non-owners.

### Dropped tables

`subscribers_to_publications` goes — no live rows, and its writers (`actions/subscribeToPublicationWithEmail.ts`, `actions/unsubscribeFromPublication.ts`, defensive rewrite in `migrate_user_to_standard.ts`) retire with it.

`email_subscriptions_to_entity` stays for now even though it has no live rows — `MailboxBlock` is a deprecation placeholder and its other consumers (`actions/subscriptions/*.ts`, `src/hooks/useSubscriptionStatus.ts`) aren't on this feature's path. `app/emails/unsubscribe/route.ts` is the exception: it's replaced in-place (see UI placeholders), so its reader of the old table goes away regardless.

### Rollout

Write the migration in `supabase/migrations/`, update `drizzle/schema.ts` + `relations.ts`, run `npm run generate-db-types`, delete the `subscribers_to_publications` writers, and extend `get_publication_data` to join `publication_newsletter_settings` into the dashboard payload.

## Delivery (Postmark + Inngest)

### From / Reply-To

- **From:** fixed `newsletters@leaflet.pub` (domain we control; no per-publication DKIM/SPF).
- **Reply-To:** publication owner's verified `reply_to_email`.

Reply-To verification is required even when the publisher has a verified `identities.email` — keeping them separate lets the publisher pick exactly which address is exposed. Verification reuses the subscriber confirmation-code flow (code emailed, owner pastes it back; no DNS).

### Message streams

- `broadcast` — newsletter sends. Honors Postmark's suppression list and one-click `List-Unsubscribe`.
- transactional (existing `outbound` or dedicated) — subscriber + reply-to confirmation codes. Not suppression-gated.

**One shared `broadcast` stream across all publications.** Postmark caps servers at 10 streams and their multi-tenant guidance is server-per-tenant, which is too operationally heavy (separate API tokens, webhooks, DKIM, analytics per publication). Tradeoff: Postmark suppressions are keyed on `(stream, email)`, so a hard bounce / complaint / one-click unsubscribe from Pub A suppresses that address for Pub B on the same stream. Our DB stays per-publication and remains the subscription source of truth; Postmark's list is a stream-wide deliverability guardrail. See "Suppression ownership" below.

### Sending path (per-post)

**Trigger:** only the first successful publish of a post fires a send. Edits and reposts don't re-send (PK conflict no-ops). Enabling newsletter on a publication with existing posts doesn't backfill — posts published before the enable flip are never emailed.

1. Publish action inserts into `publication_post_sends` with `ON CONFLICT DO NOTHING`. PK is the idempotency guard.
2. Action fires `newsletter/post.send.requested` with publication + document URIs.
3. Inngest function:
   - Snapshots `confirmed` subscribers, writes `subscriber_count`, flips `status = 'sending'`.
   - Renders via React Email templates in `emails/`.
   - Chunks into batches of ≤500 per `/email/batch` call (Postmark's cap).
   - Attaches per-recipient `Metadata: { subscriber_id, publication }` so `Bounce` / `SpamComplaint` / `SubscriptionChange` webhooks resolve back to the right row (robust to plus-addressing, forwarding, and the same email subscribed to multiple pubs).
   - Iterates the response array: appends `post_sent` only for `ErrorCode === 0`; appends a failure event otherwise. A 200 on `/email/batch` does **not** mean every recipient was accepted — Postmark returns per-message status and the current mailbox-era code in `actions/subscriptions/sendPostToSubscribers.ts` ignores it.
   - Uses step retries for per-batch transport failures (network / 5xx).
   - On terminal completion sets `status` + `completed_at` (+ `error` on fail).

### Preview sends

A "Send preview" button in the publish flow lets the author send the rendered email to a one-off address (typed into an input next to the button) before broadcasting. Ownership-gated server action; no DB writes.

Cut-outs so the preview doesn't pollute real-send state:

- Uses the transactional stream, not `broadcast` — skips Postmark suppression-gating and omits `List-Unsubscribe` headers.
- No `publication_post_sends` row (would PK-conflict the real send later) and no events appended (preview is not metered as a send).
- Template renders with a placeholder "(preview)" footer since there's no subscriber row / `unsubscribe_token`.

### Postmark webhooks

New endpoint at `app/api/postmark/webhook`:

- `Bounce` — append `bounce`. Hard bounces → `unsubscribed`; soft bounces stay `confirmed` (the event log carries the signal if we want retry logic later).
- `SpamComplaint` — append `complaint`; → `unsubscribed`.
- `SubscriptionChange` — one-click `List-Unsubscribe`. Append `unsubscribe_requested`; → `unsubscribed`.
- `Delivery` / `Open` / `Click` — not captured; revisit if product wants analytics.

Idempotency: `SubscriptionChange` for in-app unsubscribes arrives *after* we already wrote local state. Handler no-ops on already-`unsubscribed` rows.

### Template rendering

Ported from `feature/follow-via-email` (commit `c09ca71e`) into `emails/`:

- `post.tsx` — newsletter post template; also exports shared primitives (`Text`, `Heading`, `LinkBlock`, `CodeBlock`, `BlockNotSupported`, `List`, `LeafletWatermark`).
- `leafletConfirmEmail.tsx` — reply-to verification code.
- `pubConfirmEmail.tsx` — subscriber confirmation code.
- `static/` — bundled icon assets.

Built on [React Email](https://react.email). Local iteration via `npm run email:dev`. Each template inlines its Tailwind config since email clients strip external stylesheets.

**Status:** scaffolding only. `PostEmail` renders placeholder content and isn't wired to real post blocks. A block-type → email-component mapping is still needed — `components/Blocks/Block.tsx` is too coupled to DOM features email clients strip, so continue the email-native primitives pattern. Static assets need an absolute URL in production (Postmark fetches `Img src` as-is).

### Suppression ownership

Postgres is source of truth for subscription state. Postmark's suppression list is a stream-wide deliverability guardrail we mirror from — not a subscriber list. (Postmark is explicit that they don't store mailing lists; the Suppressions API tracks only `HardBounce`, `SpamComplaint`, `ManualSuppression`.)

- **Send targeting** reads local `state = 'confirmed'` only. The `broadcast` stream drops suppressed addresses itself and fires `SubscriptionChange` for reconciliation.
- **In-app unsubscribe** (`unsubscribe_token` endpoint, dashboard button): write DB, **don't** call the Suppressions API. Keeps a Pub A unsubscribe from silently breaking Pub B deliveries on the shared stream. Send-filter honors local `unsubscribed`.
- **One-click `List-Unsubscribe` from the email client**: Postmark suppresses the address stream-wide and fires `SubscriptionChange` with `Origin: Recipient`. Mirror to DB + append `unsubscribe_requested`. Cross-publication bleed is accepted here because the user acted from inside an actual email and their intent plausibly extends to the sender domain.
- **Bounce / spam complaint**: Postmark-only signals; mirror to DB + events. Hard bounce and spam complaint both flip local state to `unsubscribed`.
- **Resubscribe**: flip local state to `pending`, run the confirmation flow. If the address is on Postmark's suppression list: `HardBounce` / `ManualSuppression` → call Suppressions API to delete before the next broadcast; `SpamComplaint` → Postmark refuses deletion (permanent), surface in resubscribe UI.

## Existing UI placeholders

Most UI already exists unwired — wire these up rather than adding new components.

Placeholders branch on a hardcoded `dummy` object in `app/lish/[did]/[publication]/[rkey]/PostPubInfo.tsx` (`{ newsletterMode, user: { loggedIn, email, handle, subscribed } }`). Replacing `dummy` with real data — `newsletterMode` from `publication_newsletter_settings.enabled`, the rest from viewer identity, `subscribed` as a union of confirmed `publication_email_subscribers` and `publication_subscriptions` — is a prerequisite for every flow below.

### Subscribe (reader → publication)

`SubscribeInput` in `components/Subscribe/SubscribeButton.tsx` — rendered by `PostPubInfo`, `PublicationContent`, `PubListing`. Branches on `newsletterMode`: email vs. Atmosphere handle.

`EmailInput`, `EmailConfirm`, `EmailSubscribeSuccess` in `components/Subscribe/EmailSubscribe.tsx` are pure UI. `EmailConfirm` uses Radix `OneTimePasswordField` with `validationType="alphanumeric"` and `autoSubmit` — this settles an open item: **subscriber confirmation is a pasted code, not a link.** The 6-char uppercase hex format matches `actions/emailAuth.ts` and `emails/pubConfirmEmail.tsx`.

Subscribe button `onClick` and `EmailConfirm.onSubmit` currently only flip local state — wire to a new action that generates the confirmation code, sends via the transactional stream, and appends `subscribe_requested` + `confirmation_sent`.

### Manage / unsubscribe (logged-in reader)

`ManageSubscription` in `components/Subscribe/ManageSubscribe.tsx`. Two buttons need handlers:

- Link-email (`EmailInput` + `EmailConfirm`): wires to an "attach email to existing subscription" action creating a `publication_email_subscribers` row keyed to the caller's `identity_id`.
- Unsubscribe: flips state, appends `unsubscribe_requested`.

### Token-based unsubscribe (email footer / `List-Unsubscribe`)

`app/emails/unsubscribe/route.ts` currently keys on legacy `sub_id`. Replace (don't extend): new endpoint takes `unsubscribe_token` from `publication_email_subscribers`, writes unsubscribe. Keep the URL path stable so already-sent footers don't 404. A GET confirmation page at the same route would cover Postmark's one-click nicely but is out of scope for the first cut.

### Enable / disable newsletter (publisher)

`NewsletterSettings` in `app/lish/[did]/[publication]/dashboard/settings/ProSettings.tsx`. Branches on `dummy.newsletterMode`.

- Enable: modal with `EmailInput` → `EmailConfirm` → "Enable Newsletter". Upsert `publication_newsletter_settings` with `enabled = true` and the verified `reply_to_email`. The current placeholder short-circuits when `dummy.user.email` is set — remove that branch and always require confirmation.
- Disable: confirmation modal gated on typing the publication name. Flip `enabled = false`.
- Subscriber count + price copy are hardcoded and tagged with "don't let us merge" comments — replace with `count(*)` on confirmed subscribers + Stripe product config.

## Metering

No paid subscriptions yet, but we want the usage data to exist so billing can layer on without a backfill. Two counters matter; both are derivable from tables above without new schema:

- **Active subscribers per publication** — `count(*) from publication_email_subscribers where publication = $1 and state = 'confirmed'`. Queried on demand.
- **Emails sent per publication per period** — `publication_post_sends.subscriber_count` is snapshotted at send time, so `sum(subscriber_count) where status = 'sent' and completed_at between $start and $end` gives monthly sent volume.

No reporting cron for v1; surface both counters in the dashboard and let Stripe reporting layer on later.

## Open questions

- **Resubscribe UX** — what the form does when `state = 'unsubscribed'` (silent resubscribe vs re-confirm). Spam-complaint suppressions are permanent in Postmark; UI needs a terminal "can't resubscribe from here" branch.
- **Confirmation rate limiting / CAPTCHA** — the anon subscribe endpoint is spammable.
- **Identity linking** — backfilling `identity_id` when a subscriber later logs in.
- **Retention** — how long `unsubscribed` rows and the events log stick around (GDPR).
- **Subscriber-side auth for manage/unsubscribe** — is `unsubscribe_token` sufficient, or do we also want short-lived signed links?
