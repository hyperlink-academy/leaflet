# Newsletter Mode

**Status**: draft

## Goal

Let publication owners opt in to sending posts as emails to their subscribers. Newsletter mode is appview-specific configuration (not part of the AT-Proto publication record), so all state lives in Postgres.

## Data Model

### `publication_newsletter_settings` — per-publication newsletter configuration

A dedicated table rather than a `metadata` jsonb column on `publications`, because sender-email verification has a real lifecycle (enable → verify → rotate → revoke) that benefits from typed columns, and because "list publications with newsletter enabled" is a query we'll want cheap once metering lands.

- `publication` (text, PK, FK → `publications.uri` ON DELETE CASCADE)
- `enabled` (boolean, not null, default false)
- `enabled_at` (timestamptz, nullable) — first time newsletter was turned on
- `reply_to_email` (text, nullable) — owner's address; replies from readers go here
- `reply_to_verified_at` (timestamptz, nullable) — null means unverified; set once the confirmation code flow completes
- `created_at` (timestamptz, not null, default now())
- `updated_at` (timestamptz, not null, default now())

All sends go From `newsletters@leaflet.pub` (or similar, a domain we control); no per-publication sender verification needed.

Indexes:
- Partial index on `enabled WHERE enabled` — for ops/billing reconciliation queries.

RLS:
- Writes: publication owner only (same ACL as `publication_domains`).
- Reads: `enabled` is effectively public (surfaced on the subscribe UI), but `sender_email` and verification state are owner-only. Either split into two tables or enforce at the RPC layer.

### Migration sketch

```sql
create table "public"."publication_newsletter_settings" (
  "publication" text primary key
    references publications(uri) on delete cascade,
  "enabled" boolean not null default false,
  "enabled_at" timestamptz,
  "reply_to_email" text,
  "reply_to_verified_at" timestamptz,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create index publication_newsletter_settings_enabled_idx
  on publication_newsletter_settings (enabled) where enabled;

alter table "public"."publication_newsletter_settings"
  enable row level security;

-- grants + RLS policies TBD
```

Plus:
- Add matching `pgTable` in `drizzle/schema.ts`.
- Run `npm run generate-db-types` to refresh Supabase types.
- Extend `get_publication_data` (or add a new RPC) to join this row into the dashboard payload.

### `publication_email_subscribers` — per-publication email subscriber list

Replaces the two legacy tables that are being dropped (see below). One row per `(publication, email)`. Unsubscribes are soft — the row stays, state transitions to `unsubscribed`. This lets us honor re-subscribe requests cleanly and keeps history intact for the events table.

Columns:
- `id` (uuid, PK, default `gen_random_uuid()`)
- `publication` (text, not null, FK → `publications.uri` ON DELETE CASCADE)
- `email` (text, not null)
- `identity_id` (uuid, nullable, FK → `identities.id` ON DELETE SET NULL) — set if the subscriber is a logged-in Leaflet user at signup time
- `state` (text, not null, default `'pending'`) — one of `pending` (awaiting confirmation), `confirmed`, `unsubscribed`. A text check constraint keeps this honest.
- `confirmation_code` (text, nullable) — cleared once confirmed
- `unsubscribe_token` (uuid, not null, default `gen_random_uuid()`, unique) — opaque token used in Postmark `List-Unsubscribe` URLs
- `created_at` (timestamptz, not null, default now())
- `confirmed_at` (timestamptz, nullable)
- `unsubscribed_at` (timestamptz, nullable)

Indexes / constraints:
- `unique (publication, email)` — one record per address per publication; a re-subscribe updates the existing row back to `pending`/`confirmed` rather than inserting.
- Partial index on `(publication) WHERE state = 'confirmed'` — counts and send targeting hit this.
- Unique index on `unsubscribe_token`.

RLS:
- Inserts by anon: allowed (subscribe form), but only with `state = 'pending'`.
- Reads of individual rows: public by `unsubscribe_token` (manage-subscription link); full list is owner-only.
- Updates: service role + the owner.

### `publication_email_subscriber_events` — append-only event log

One table per event type would balloon; instead, one append-only log covering the lifecycle. Useful for debugging delivery issues, computing timeseries, and later billing reconciliation.

Columns:
- `id` (uuid, PK, default `gen_random_uuid()`)
- `subscriber` (uuid, not null, FK → `publication_email_subscribers.id` ON DELETE CASCADE)
- `publication` (text, not null, FK → `publications.uri` ON DELETE CASCADE) — denormalized for cheap per-publication queries
- `event_type` (text, not null) — `subscribe_requested`, `confirmation_sent`, `confirmed`, `unsubscribe_requested`, `resubscribed`, `post_sent`, `bounce`, `complaint`. Check constraint enforces the enum.
- `occurred_at` (timestamptz, not null, default now())
- `metadata` (jsonb, nullable) — event-specific payload (e.g. `{ "document": "at://…" }` for `post_sent`, `{ "reason": "…" }` for `bounce`)

Indexes:
- `(subscriber, occurred_at desc)` — per-subscriber timeline.
- `(publication, event_type, occurred_at desc)` — "how many confirms this week" etc.

This is the single source of truth for "when did X happen" — subscribe confirmations, unsubscribes, per-post sends, and Postmark bounce/complaint webhooks all land here. Columns on `publication_email_subscribers` like `confirmed_at` / `unsubscribed_at` are convenience caches derivable from this log.

### `publication_post_sends` — per-post send record

One row per `(publication, document)` send attempt. Primary job is idempotency: the publish action checks this table before triggering a send so republishing/retrying can't double-email. Secondary job is cheap dashboard counts ("emailed N subscribers") without scanning the events log.

Columns:
- `publication` (text, not null, FK → `publications.uri` ON DELETE CASCADE)
- `document` (text, not null, FK → `documents.uri` ON DELETE CASCADE)
- `status` (text, not null, default `'pending'`) — `pending`, `sending`, `sent`, `failed`. Check constraint enforces the enum.
- `subscriber_count` (int, nullable) — snapshot of confirmed subscribers at send time; null until the batch is built
- `started_at` (timestamptz, not null, default now())
- `completed_at` (timestamptz, nullable) — set when `status` moves to `sent` or `failed`
- `error` (text, nullable) — populated when `status = 'failed'`

Primary key: `(publication, document)` — the unique constraint is the idempotency guarantee. Inserting with `ON CONFLICT DO NOTHING` is the race-safe "reserve this send" pattern.

Indexes:
- PK covers the common lookup.
- `(publication, started_at desc)` — for the dashboard's recent-sends list.

Per-recipient delivery detail (which addresses got it, bounces, complaints) stays in `publication_email_subscriber_events`; this table is only the post-level aggregate.

### Tables to drop

Both are replaced by the above and have no remaining real consumers after the newsletter flow lands:

- `subscribers_to_publications` — old email-keyed stub from `20250321233105_add_subscribers_to_publications_table.sql`. Only writer is `actions/subscribeToPublicationWithEmail.ts`; nothing reads it. Drop the table + the action + `unsubscribeFromPublication.ts`.
- `email_subscriptions_to_entity` — the mailbox-era table from `20240821203026_add_email_subscription_tables.sql`. Consumers: `actions/subscriptions/{subscribeToMailboxWithEmail,sendPostToSubscribers,confirmEmailSubscription,deleteSubscription}.ts`, plus `app/emails/unsubscribe/route.ts` and `migrate_user_to_standard.ts`. Mailbox flow is being retired; drop the table and those actions/routes.

Audit before the drop migration runs: verify no live writes in the last 30 days for either table (quick `select max(created_at)` sanity check).

### Migration sketch (additions)

```sql
create table "public"."publication_email_subscribers" (
  "id" uuid primary key default gen_random_uuid(),
  "publication" text not null
    references publications(uri) on delete cascade,
  "email" text not null,
  "identity_id" uuid
    references identities(id) on delete set null,
  "state" text not null default 'pending'
    check (state in ('pending', 'confirmed', 'unsubscribed')),
  "confirmation_code" text,
  "unsubscribe_token" uuid not null default gen_random_uuid(),
  "created_at" timestamptz not null default now(),
  "confirmed_at" timestamptz,
  "unsubscribed_at" timestamptz,
  unique (publication, email),
  unique (unsubscribe_token)
);

create index publication_email_subscribers_confirmed_idx
  on publication_email_subscribers (publication)
  where state = 'confirmed';

create table "public"."publication_email_subscriber_events" (
  "id" uuid primary key default gen_random_uuid(),
  "subscriber" uuid not null
    references publication_email_subscribers(id) on delete cascade,
  "publication" text not null
    references publications(uri) on delete cascade,
  "event_type" text not null check (event_type in (
    'subscribe_requested', 'confirmation_sent', 'confirmed',
    'unsubscribe_requested', 'resubscribed',
    'post_sent', 'bounce', 'complaint'
  )),
  "occurred_at" timestamptz not null default now(),
  "metadata" jsonb
);

create index publication_email_subscriber_events_subscriber_idx
  on publication_email_subscriber_events (subscriber, occurred_at desc);

create index publication_email_subscriber_events_publication_idx
  on publication_email_subscriber_events (publication, event_type, occurred_at desc);

create table "public"."publication_post_sends" (
  "publication" text not null
    references publications(uri) on delete cascade,
  "document" text not null
    references documents(uri) on delete cascade,
  "status" text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed')),
  "subscriber_count" integer,
  "started_at" timestamptz not null default now(),
  "completed_at" timestamptz,
  "error" text,
  primary key (publication, document)
);

create index publication_post_sends_publication_idx
  on publication_post_sends (publication, started_at desc);

alter table "public"."publication_email_subscribers" enable row level security;
alter table "public"."publication_email_subscriber_events" enable row level security;
alter table "public"."publication_post_sends" enable row level security;

-- drop legacy
drop table "public"."subscribers_to_publications";
drop table "public"."email_subscriptions_to_entity";
```

Plus:
- Delete the accompanying actions/routes: `actions/subscribeToPublicationWithEmail.ts`, `actions/unsubscribeFromPublication.ts`, `actions/subscriptions/*.ts`, `app/emails/unsubscribe/route.ts`. Any references in `migrate_user_to_standard.ts` need cleaning up too.
- Remove the dropped tables from `drizzle/schema.ts` and `drizzle/relations.ts`; add the two new tables.
- Regenerate Supabase types.

## Delivery (Postmark + Inngest)

### From / Reply-To

- **From:** fixed `newsletters@leaflet.pub` for every publication. No per-publication DKIM/SPF setup.
- **Reply-To:** publication owner's verified `reply_to_email`. Replies land in the owner's inbox.
- Reply-To verification reuses the same confirmation-code mechanism as subscriber confirmations (code emailed, owner pastes it back). No DNS involved.

### Message streams

- `broadcast` — newsletter sends. Honors Postmark's native suppression list and one-click `List-Unsubscribe`.
- transactional (existing `outbound` or a dedicated stream) — subscriber confirmation codes and reply-to verification codes. Not suppression-gated.

### Sending path (per-post)

1. Publish action inserts `publication_post_sends` with `status = 'pending'` using `INSERT … ON CONFLICT DO NOTHING`. The PK doubles as the idempotency guard — a repeat publish is a no-op.
2. Action fires an Inngest event (e.g. `newsletter/post.send.requested`) with publication URI + document URI.
3. Inngest function:
   - Snapshots `confirmed` subscribers, writes `subscriber_count` and flips `status = 'sending'`.
   - Renders the email via the React Email templates in `emails/` (see "Template rendering" below).
   - Chunks into batches of ≤500 recipients per `/email/batch` call (Postmark's batch size cap).
   - Appends one `post_sent` event per recipient to `publication_email_subscriber_events`.
   - Uses Inngest step retries for per-batch failures.
   - On terminal completion, updates `status` to `sent` or `failed` + `completed_at` + `error`.

### Postmark webhooks

New appview endpoint (e.g. `app/api/postmark/webhook`) receives:

- `Bounce` — append `bounce` event; on hard bounce transition subscriber to `unsubscribed`.
- `SpamComplaint` — append `complaint` event; transition to `unsubscribed`.
- `SubscriptionChange` — fires when a reader uses Postmark's one-click `List-Unsubscribe`. Append `unsubscribe_requested` + transition to `unsubscribed`.
- `Delivery` / `Open` / `Click` — not captured for now; revisit if product wants open/click analytics.

### Template rendering

Ported from `feature/follow-via-email` (commit `c09ca71e`). Lives in `emails/`:

- `emails/post.tsx` — newsletter post template. Also exports shared primitives used by the other templates: `Text`, `Heading`, `LinkBlock`, `CodeBlock`, `BlockNotSupported`, `List`, `LeafletWatermark`.
- `emails/leafletConfirmEmail.tsx` — code-based confirmation email for Leaflet-level email verification (reply-to verification, etc).
- `emails/pubConfirmEmail.tsx` — code-based confirmation email for publication subscribe flow.
- `emails/static/` — bundled icon assets (`leaflet.png`, `comment.png`, `external-link.png`, `quote.png`).

Built on [React Email](https://react.email) per the [manual setup guide](https://react.email/docs/getting-started/manual-setup):

- `@react-email/components` (prod) — primitive components (`Html`, `Body`, `Section`, `Tailwind`, etc.)
- `react-email` (prod) — provides the `email` CLI used by the `email:dev` script
- `@react-email/ui` (dev) — preview server UI

The deprecated `@react-email/preview-server` has been dropped. Local iteration runs via `npm run email:dev` (invokes `email dev` against `emails/`).

Each template ships its own inlined Tailwind config (via `@react-email/components`'s `Tailwind` wrapper) because email clients strip external stylesheets.

**Status at port time:** scaffolding only. `PostEmail` currently renders hardcoded placeholder content (demo lists, demo code block, etc.); it is not yet wired to real post blocks. The confirm-email templates are closer to shippable but also contain some placeholder copy.

**Remaining work on the renderer:**

- Pass real props (title, author, cover image, body blocks, post URL, unsubscribe token) into each template.
- Implement a block-type → email-component mapping so `PostEmail` can walk the actual block list instead of rendering demo content. `components/Blocks/Block.tsx` is already imported in `post.tsx` but unused — decide whether to reuse the on-site renderer (likely too coupled to DOM features email strips) or continue the pattern of email-native primitives in `emails/post.tsx`.
- Static assets need to be served from a public, absolute URL in production emails (Postmark fetches `Img src` as-is; relative `/static/*.png` won't resolve for recipients). Point them at a CDN or `app/static/` route.
- Render path in the Inngest send function: call `render()` from `@react-email/components` with the template and props to produce `HtmlBody` / `TextBody` for the Postmark batch payload.

### Suppression ownership

Postmark is the source of truth for suppressions. Flow:

- Postmark webhook → we mirror the state into `publication_email_subscribers.state`.
- Our in-app unsubscribe (via `unsubscribe_token`) calls Postmark's Suppressions API first, then writes the local row.
- Resubscribing a previously-unsubscribed reader requires unsuppressing via Postmark's API before the next broadcast will reach them.

## Open questions / deferred

- **Preview / test send** — authors sending a test email to themselves before broadcasting.
- **Scheduled / backdated sends** — does a backdated publish still trigger a send? Probably not; spec should nail down.
- **Resubscribe UX** — specifically, what the subscribe form does when `state = 'unsubscribed'` (silent resubscribe vs re-confirm). Tied to the Postmark unsuppress call.
- **Confirmation rate limiting / CAPTCHA** — the anon subscribe endpoint is spammable.
- **Identity linking** — backfilling `identity_id` when a subscriber later logs in.
- **Retention** — how long `unsubscribed` rows and the events log stick around (GDPR angle).
- **Stripe metering** — where the usage-reporting cron reads subscriber counts from.
- **Subscriber-side auth for manage/unsubscribe** — `unsubscribe_token` is sketched; confirm that's sufficient or if we want short-lived signed links too.
- **Naming** — `publications.record` (the AT-Proto mirror) vs appview-only columns. Current plan: appview-only state never touches `record`.
