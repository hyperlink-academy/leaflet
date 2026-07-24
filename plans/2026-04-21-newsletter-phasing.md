# Newsletter rollout — phasing

Companion to `specs/2026-04-20-newsletter-mode.md`. Eight sequenced phases;
each verifiable end-to-end. Phases 1–2 have landed; 3–8 remain.

## Status at a glance

| Phase | Scope | Status |
|---|---|---|
| 1 | Schema + public read path | **Shipped on `main`** (commit `53809d92 add newsletter tables`) |
| 2 | Publisher enable / reply-to verification | **On `feature/newsletter`**, enable flow verified working |
| 3 | Subscriber signup (anon + logged-in) | pending |
| 4 | Post email template + preview send | pending |
| 5 | Broadcast send pipeline | pending |
| 6 | Unsubscribe + manage (local state only) | pending |
| 7 | Postmark webhooks + suppression reconciliation | pending |
| 8 | Dashboard metering | pending |

## Phase 1 — Schema & public read path · SHIPPED

Landed on `main` via `53809d92`. Migration already applied to local supabase; will
deploy to prod on merge of main to production environment.

**What shipped:**
- `supabase/migrations/20260421000000_add_newsletter_tables.sql`
  - Creates `publication_newsletter_settings`, `publication_email_subscribers`,
    `publication_email_subscriber_events`, `publication_post_sends`.
  - RLS enabled on all four; no policies (server-action authority only).
  - Partial indexes on `enabled WHERE enabled` and `state = 'confirmed'`.
  - Drops `subscribers_to_publications`.
- `app/api/rpc/[command]/get_publication_data.ts:48` — adds
  `publication_newsletter_settings(enabled)` join (public projection only —
  `reply_to_email` / verification state never returned).
- `app/api/inngest/functions/migrate_user_to_standard.ts` — defensive rewrite
  path for `subscribers_to_publications` removed.
- `actions/subscribeToPublicationWithEmail.ts`,
  `actions/unsubscribeFromPublication.ts` — deleted.
- `app/lish/Subscribe.tsx` — dead import of `subscribeToPublicationWithEmail` removed.
- `supabase/database.types.ts` — surgical additions for the 4 new tables +
  removal of `subscribers_to_publications`. Drizzle files intentionally not
  regenerated (main's versions are drifted from main's own migrations; drift
  cleanup is a separate chore).

**Gotchas worth knowing:**
- `DB_URL` in `.env.local` points at *prod*, so `npm run generate-db-types` runs
  `drizzle-kit introspect` against prod. To regenerate against local, run
  `DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres npx drizzle-kit introspect`.
- `npm run lint` is broken on the repo — Next 16 dropped `next lint` and there's
  no flat ESLint config yet. Not introduced by newsletter work. Use
  `npx tsc --noEmit` for CI-relevant checking.

## Phase 2 — Publisher enable / reply-to verification · ON BRANCH

On `feature/newsletter`, uncommitted. Owner smoke-tested enabling a publication
through the dashboard modal end-to-end.

**What shipped:**
- `supabase/migrations/20260421100000_add_newsletter_confirmation_code.sql` —
  adds `confirmation_code` column to `publication_newsletter_settings`.
  Pending verification row holds the code; nulled out on successful confirm.
- `actions/publications/newsletter.tsx` — four owner-gated server actions:
  - `getNewsletterSettings(publicationUri)` — owner-facing read of full row
    including `reply_to_email` and `reply_to_verified_at`. Not yet used in UI;
    ready for Phase 3 if we want to surface the verified reply-to.
  - `requestReplyToVerification(publicationUri, email)` — validates email,
    generates 6-char hex code, upserts settings row with
    `enabled=false, reply_to_email, confirmation_code, reply_to_verified_at=null`,
    sends via Postmark using `leafletConfirmEmail.tsx`. Dev mode logs the code
    to console instead of calling Postmark.
  - `confirmReplyToVerification(publicationUri, code)` — validates code, flips
    `enabled=true`, stamps `reply_to_verified_at`, nulls the code.
  - `disableNewsletter(publicationUri)` — flips `enabled=false`.
  - All four funnel through `assertPublicationOwner` which matches
    `publications.identity_did` against `getIdentityData().atp_did`.
- `emails/leafletConfirmEmail.tsx` — now takes a `code?: string` prop
  (defaults to `"000000"` for the `npm run email:dev` preview server).
- `app/lish/[did]/[publication]/dashboard/settings/ProSettings.tsx` —
  `NewsletterSettings` reads `enabled` from `usePublicationData()`, removes
  the `dummy.user.email` short-circuit, wires enable modal
  (request → confirm → mutate) and disable modal (gated on typing pub name).
- `supabase/database.types.ts` — surgical add of `confirmation_code` to the
  three `publication_newsletter_settings` sections.

**Shape note:** the `publication_newsletter_settings` FK is declared
`isOneToOne: true`, so PostgREST returns a single object (not an array):
`data.publication.publication_newsletter_settings?.enabled`.

**Known gaps going into Phase 3:**
- Postmark `MessageStream` isn't explicitly set on the confirmation send;
  inherits the server's default. Matches `emailAuth.ts` convention. If the
  transactional server ends up sharing a Postmark server with the broadcast
  stream (Phase 6), we'll need to set `MessageStream: "outbound"` or similar
  explicitly.
- `NewsletterSettings` is mounted inside the `!(canSeePro && isPro)` branch in
  `app/lish/[did]/[publication]/dashboard/settings/SettingsContent.tsx` —
  likely inverted pro gating in the scaffolding. Out of Phase 2 scope; worth
  fixing before GA.
- Rate limiting on request endpoint — skipped (owner action, low abuse
  surface). Revisit if we later expose this to non-owners for any reason.

## Phase 3 — Subscriber signup (anon + logged-in)

**Scope:**
- Replace the `dummy` object in
  `app/lish/[did]/[publication]/[rkey]/PostPubInfo.tsx` with real server-derived
  `{ newsletterMode, user: { loggedIn, email, handle, subscribed } }`.
  `subscribed` is the union of confirmed `publication_email_subscribers` and
  existing `publication_subscriptions`.
- Actions: `requestPublicationEmailSubscription` (pending row,
  sends `emails/pubConfirmEmail.tsx`, appends `subscribe_requested` +
  `confirmation_sent` events), `confirmPublicationEmailSubscription`
  (validates code, flips to `confirmed`, appends `confirmed` event).
- Wire `components/Subscribe/SubscribeButton.tsx` and `EmailSubscribe.tsx`.
- Basic IP/email rate limit on the anon request endpoint (CAPTCHA is an
  open question per spec).

**Verify:** anon user subscribes end-to-end; row ends `confirmed` with full
event trail. Logged-in flow sets `identity_id`. Re-subscribing the same
`(publication, email)` updates the existing row.

**Unblocks:** Phase 6 broadcast has a real target list.

## Phase 4 — Post email template + preview send

**Scope:**
- Port `PostEmail` and primitives (`Text`, `Heading`, `LinkBlock`, `CodeBlock`,
  `BlockNotSupported`, `List`, `LeafletWatermark`) from
  `feature/follow-via-email` commit `c09ca71e` into `emails/post.tsx`.
- Block-type → email-component mapping covering each renderer in
  `components/Blocks/` (text, heading, link, code, list, image, embed) with
  `BlockNotSupported` fallback.
- Resolve `emails/static/` assets via absolute URLs (Postmark fetches
  `Img src` verbatim).
- Preview-send action — ownership-gated, transactional stream, "(preview)"
  footer, no `publication_post_sends` row, no events. Wire "Send preview"
  button in the publish flow.

**Verify:** `npm run email:dev` renders a sample post. Author sends preview
to self; inbox matches. DB unchanged.

## Phase 5 — Broadcast send pipeline

**Scope:**
- In `publishToPublication`, on first successful publish insert
  `publication_post_sends` with `ON CONFLICT DO NOTHING`, then fire
  `newsletter/post.send.requested` with publication + document URIs.
- Inngest function in `app/api/inngest/functions/`: snapshot confirmed
  subscribers → write `subscriber_count`, flip `status='sending'`; render via
  Phase 4 template; chunk into ≤500 per `/email/batch` call with per-recipient
  `Metadata: { subscriber_id, publication }`; iterate response array,
  appending `post_sent` on `ErrorCode===0` and failure event otherwise;
  step-retry per-batch transport failures only; set terminal `status` +
  `completed_at` (+ `error`).
- Uses `broadcast` stream with `List-Unsubscribe` header pointing at the
  existing `app/emails/unsubscribe/route.ts` (Phase 6 rewrites it to
  `unsubscribe_token`; URL path stays stable so headers keep working).

**Verify:** publish to a newsletter-enabled pub with ≥2 confirmed subscribers
— both receive, row transitions to `sent`, events logged. Re-publish same
URI = zero new sends (PK conflict). Posts published before `enabled` flip
are not backfilled.

## Phase 6 — Unsubscribe + manage (local state only)

**Scope:**
- Rewrite `app/emails/unsubscribe/route.ts` to key on `unsubscribe_token`
  (keep URL path stable so older footers don't 404).
- Wire `components/Subscribe/ManageSubscribe.tsx` buttons:
  - In-app unsubscribe action (flip state, append `unsubscribe_requested`).
  - Link-email action for handle-only subscribers (creates
    `publication_email_subscribers` row tied to `identity_id`).
- Resubscribe action: `unsubscribed` → `pending` + re-run Phase 3 confirmation,
  append `resubscribed`.
- **Postmark Suppressions API deletion is deferred to Phase 7** — document the
  gap in code comments.

**Verify:** footer link + in-app button flip state; resubscribe replays
confirmation; legacy `?sub_id=` URLs return a sensible response.

## Phase 7 — Postmark webhooks + suppression reconciliation

**Scope:**
- New signature-verified `app/api/postmark/webhook` endpoint handling `Bounce`
  (append; hard → `unsubscribed`), `SpamComplaint` (append + `unsubscribed`),
  `SubscriptionChange` (append + `unsubscribed`; no-op if already
  `unsubscribed`). Deliver / Open / Click ignored.
- Wire Phase 6 resubscribe to Postmark Suppressions API: delete for
  `HardBounce` / `ManualSuppression`; surface terminal "can't resubscribe"
  branch on `SpamComplaint`.

**Verify:** fire each payload via Postmark's webhook tester — DB transitions +
events match spec; one-click unsubscribe from a real inbox suppresses at
Postmark AND mirrors locally; in-app unsubscribe does NOT hit Suppressions API.

## Phase 8 — Dashboard metering

**Scope:**
- Replace the hardcoded subscriber count + price copy in `NewsletterSettings`
  with `count(*) FILTER (WHERE state='confirmed')`.
- Add period-sent aggregate via
  `sum(subscriber_count) WHERE status='sent' AND completed_at BETWEEN …`.
- Add recent-sends list reading `publication_post_sends` by
  `(publication, started_at desc)`.

**Verify:** counts reflect Phase 3/6 activity.

## Open items tracked across phases

- **Drift cleanup** on `drizzle/schema.ts` and `drizzle/relations.ts` is
  pending — not blocking newsletter work, but should happen once
  `DB_URL` defaults to local or someone regenerates from prod
  post-migration.
- **`npm run lint`** still broken (Next 16 / ESLint 9 flat config). Unrelated
  but painful when a PR needs lint green.
- **Pro gating** in `SettingsContent.tsx` for `NewsletterSettings` appears
  inverted — shows newsletter UI to non-pro users. Fix before GA.
- **Rate limiting / CAPTCHA** on anon subscribe endpoint (Phase 3) — spec
  open question.
- **Identity linking** when a subscriber later logs in — spec open question.
- **Retention** for `unsubscribed` rows + events log (GDPR) — spec open
  question.
