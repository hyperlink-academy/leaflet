# Dynamic/static split

Goal: stop paying for `cookies()`/`headers()` + the 15-relation identity query on
every request. Published pages become fully CDN-cacheable (ISR); identity-driven
UI becomes scoped islands with no layout shift. Dashboard stays dynamic
(identity SSR — that's what prevents theme flash) but gets instant navigations
and proper loaders.

## Ground truth (from the audit)

- Installed Next is **16.2.3** (package.json says ^16.0.7). Top-level
  `cacheComponents` exists but we are NOT enabling it: it invalidates every
  route-segment config in the app (`force-dynamic`, `fetchCache`,
  `revalidate`) and forces a whole-app migration. Classic ISR + route-group
  split is incremental and sufficient.
- `app/(app)/layout.tsx:15,20` (`await headers()` + `IdentityProviderServer` →
  `cookies()`) makes all ~45 routes dynamic. This is the single blocker.
- The entire published-page content path is identity-free except:
  1. `fetchPollData.ts:16-17` — reads identity, never uses it (dead).
  2. `getPostPageData.ts:93-115` — members-only gating (real, per-viewer RSC
     payload).
  3. `join/`, `contributor_accept/`, `edit/`, `theme-settings/`, `dashboard/`
     under lish — genuinely identity-gated pages.
- Identity SWR (`components/IdentityProvider.tsx:40-46`) has ALL revalidation
  off; identity only arrives via server `initialValue` or explicit `mutate`.
  A static page must therefore explicitly fetch identity client-side or every
  consumer renders logged-out forever.
- Dashboard theme = `home_leaflet` facts embedded in the identity payload →
  Replicache `initialFacts` → synchronous first-paint colors. **Dashboard must
  keep server-side identity** or logged-in users get a default-theme flash.
- `RequestHeadersProvider`: `country` is dead; `timezone`/`language` only
  pre-hydration date locale (self-corrects 80ms after mount, text-only).
- Instant dashboard nav today = `experimental.staleTimes` (600s router cache) +
  hover-prefetch `SpeedyLink`. Eroded by global `router.refresh()` calls and
  zero `loading.tsx` files.
- URL building on pub pages comes from the publication record, never the Host
  header → one ISR entry per (did, publication, path) serves every custom
  domain. Only sitemap/robots/OG-screenshot are host-dependent (already
  route handlers with their own CDN headers).

## Target architecture

Two route groups under `(app)`, replacing the current shared dynamic layout:

```
app/(app)/
├── (identity)/layout.tsx     ← dynamic: IdentityProviderServer (SSR identity),
│   │                            RequestHeadersProvider (drop country),
│   │                            global modals, RouteUIStateManager
│   ├── (home-pages)/…        ← home, looseleafs, notifications, memberships,
│   │                            reader/*, tag/[tag], p/[didOrHandle] profiles
│   ├── [leaflet_id]/…        ← editor (+ publish). stays force-dynamic
│   ├── lish/[did]/[publication]/{dashboard,edit,theme-settings,join,
│   │                            contributor_accept}  ← pub-owner surfaces
│   ├── lish/createPub, lish/sorry-boris
│   ├── checkout/, admin/, merge-accounts/, new/, subscribe? (no — published)
│
└── (published)/layout.tsx    ← static-safe: NO cookies/headers anywhere.
    │                            ClientIdentityProvider (initialValue null,
    │                            fetches slim viewer identity on mount),
    │                            global modals (client, closed by default)
    ├── lish/[did]/[publication]/  layout, page, [rkey]/**, archive,
    │                            subscribe, subscribeSuccess, rss/atom/json,
    │                            sitemap, robots, icon, opengraph, .well-known
    ├── p/[didOrHandle]/[rkey]/**  standalone posts
    └── subscribe/[did]/[rkey]     subscribe landing
```

Route groups can split children of the same URL subtree (`/lish/x/y` in
(published), `/lish/x/y/dashboard` in (identity)) as long as no URL resolves in
both groups. The (identity) lish surfaces already fetch identity in their own
layouts/pages; they keep doing that.

Identity context exists in BOTH groups (global modals and interaction
components need it) — fed differently:
- (identity): `IdentityProviderServer` exactly as today. No UX change, no flash.
- (published): a client-only provider mounting `IdentityContextProvider` with
  `initialValue={null}` plus fetch-on-mount of a **slim viewer identity**
  (`getViewerIdentity` server action: identity row basics, bsky profile,
  publication_subscriptions, publication_email_subscribers,
  publication_memberships, entitlements — NO home_leaflet facts, NO
  permission_token_on_homepage). Returns the same `Identity` type with heavy
  fields empty so all existing consumers type-check and behave.

## Stages

### Stage 1 — layout split (high level)
1. Create `(identity)` and `(published)` group layouts as above; delete
   `app/(app)/layout.tsx`.
2. `git mv` route folders per the tree. URLs must not change.
3. `IdentityProvider`: support client-fetch mode (`fetchOnMount`) used only by
   the (published) layout; dashboard path unchanged.
4. Add `getViewerIdentity` slim action (or interim: reuse `getIdentityData` as
   the mount fetcher, slim in stage 2).
5. Kill dead dynamic reads so (published) is actually static-capable:
   - `fetchPollData.ts:16-17` dead identity read
   - dead identity destructures in `Interactions.tsx:190,295` (+ unused
     `ManageSubscription` import)
   - `country` header plumbing
6. Hot-path hygiene: remove `console.log`s in lish pages/DocumentPageRenderer.
7. Wrap duplicated fetchers in `React.cache` (fetchPublicationForPage,
   handle/DID resolution, get_leaflet_data handler, postPageMetadata's
   queries) — halves per-request query load independent of caching.

Adversarial review gate 1 (Opus): route-group correctness (no URL collisions,
no lost layouts/metadata), no remaining dynamic API in (published) tree,
identity context behavior parity, login/logout/subscribe flows still
repopulate identity.

### Stage 2 — published pages: ISR + identity islands, zero layout shift
0. **PREREQ (found in Stage-1 sweep): stop calling useSearchParams in
   `postPageState.ts` / `useDrawerOpen.ts`.** The Suspense boundary added in
   Stage 1 prevents the 500, but on a static route Next client-renders the
   suspended subtree — `<PostPages>` is the entire post body, so ISR'ing post
   pages as-is would serve empty HTML to crawlers. Read params via
   window.location (useSyncExternalStore/effect) keeping SSR param-free, then
   the PostPages Suspense boundary can be removed.
1. `export const revalidate` on all (published) pages (start 300s;
   subscribeSuccess/subscribe can be long). Verify `next build` output shows
   ISR. Wire invalidation: existing `revalidatePath` calls on
   publish/delete/subscribe already target these layouts; add missing ones
   (theme change, page publish).
2. Members-only: static render is ALWAYS the anonymous/gated variant
   (truncate + paywall). New identity island in the paywall region: when slim
   identity suggests possible entitlement, call `getUnlockedPost(documentUri)`
   server action (does owner/contributor/membership check server-side, returns
   unlocked pages + their block resources), swap in place with a scoped loader
   inside the paywall card. No layout shift for anonymous readers (byte-
   identical); entitled readers see paywall → content expand (an unlock, not a
   shift).
3. Subscribe surfaces: enforce fixed geometry across the four
   SubscribeButton/SubscribeInput variants (stable container box; state swaps
   in place). Verify with the tests-subscribe harness.
4. PostHeader owner edit-pencil + footer EditButton: render in reserved/overlay
   space so owner hydration doesn't shift the byline/interactions rows.
5. Dates: (published) has no RequestHeadersProvider → SSR renders
   server-locale dates, existing 80ms client correction handles locale
   (text-only change). Confirm no geometry change.
6. Metadata/page fetch dedupe via the Stage-1 React.cache wrappers.
7. Convert inline not-found JSX on pub/post pages to `notFound()` so misses
   aren't cached as 200s.
8. Confirm poll aggregate data is content (server, revalidated); voter state
   stays client-side.

Adversarial review gate 2 (Opus): curl page twice with/without auth cookie —
identical HTML + cache headers; no cookies()/headers() reachable in any
(published) render path; members-only cannot leak gated content into the
static payload; subscribe geometry stable across all identity states;
revalidation actually fires on publish/edit/delete.

### Stage 3 — dashboard: loaders, instant nav, state continuity
1. `loading.tsx` per dashboard page segment (inside the persistent shell):
   home, looseleafs, notifications, memberships, reader/*, tag, profile,
   lish dashboard. One top-level loader per page; nav/shell never unmounts.
2. Stabilize ReplicacheProvider against server re-renders (token object
   identity currently tears down/rebuilds the client on every RSC render of
   (home-pages) layout).
3. NavStateTracker: keep mounted across home ↔ pub-dashboard (move to
   (identity) layout), preserving the nav-state cookie behavior.
4. Audit `router.refresh()` on dashboard-adjacent flows; replace with targeted
   `mutate` where it exists only to repopulate identity, keep where RSC
   content genuinely changes.
5. Mobile: sidebar/portal state must survive home → pub → home (verify
   DashboardShell remount behavior, scroll restoration via usePreserveScroll).

Adversarial review gate 3 (Opus): no theme flash for logged-in dashboard visit
(cold load + client nav), nav state/scroll preserved down to pub dashboard and
back, no double loaders, router cache intact after subscribe/membership flows.

### Stage 4 — per-page sweep
1. `[leaflet_id]`: React.cache dedupe of `get_leaflet_data` + `get_facts`
   between page and generateMetadata (currently 2× each per request — the
   heaviest queries in the app). Stays force-dynamic.
2. subscribe/[did]/[rkey] metadata dedupe; checkout/merge-accounts stay
   dynamic (correct); icon route header contradiction fixed.
3. Sweep for any remaining cookies()/headers() in render paths outside
   (identity) surfaces.

Adversarial review gate 4 (Opus): full-route-table review of `next build`
output vs intent.

### Verification
- `npx tsc`, `npm run check-query-plans`, `next build` route table.
- Prod-ish run: curl published page anonymous vs authed → identical body,
  `Cache-Control`/ISR headers present; second hit is a cache HIT.
- Headless browser: logged-in dashboard cold load — no default-theme frame;
  pub page — no CLS from subscribe/interactions hydration (compare layout
  before/after identity fetch resolves).

## Stage 1 outcome (gate 1 passed, no blockers)

Deviation from the target tree, deliberate: the identity-gated lish surfaces
(dashboard, edit, theme-settings, join, contributor_accept, createPub,
sorry-boris) stay nested inside (published) — each wraps itself in
IdentityProviderServer (shadowing the viewer provider) and declares
force-dynamic explicitly. `npm run check-published-purity` (CI tripwire)
enforces: no request-state reads in (published) outside those surfaces, no
caching config on them or on the shared pub layout — revalidate/
generateStaticParams go on individual public pages only.
ViewerIdentityProvider fetches on every mount when the session marker is
present (no bail-on-seeded — the seed may be stale) and seeds fallbackData
from the dashboard's cache entry, re-read every render. Legacy
external_auth_token="null" cookies are treated as logged-out; identity
actions isUuid-guard the token. Do NOT deploy Stage 1 standalone: logged-in
readers get a logged-out first paint on published pages until Stage 2's
geometry work lands.

## Amendments from adversarial review 1 (empirically verified on 16.2.3)

Route-group split across the same URL subtree is CONFIRMED safe (static
segments beat `[rkey]` across group boundaries; verified with a real build,
both bundlers; shipped precedent: `(home-pages)/p/[didOrHandle]/comments`).

1. **Stage 1 step 0 — hoist shared modules out of the route tree first.**
   `lish/createPub/getPublicationURL` (40+ importers incl. emails/, src/),
   `lish/subscribeToPublication.ts`, and anything else imported from outside
   its future group. Tree also must include `lish/feeds|uri|url` routes.
2. **useSearchParams without Suspense = HTTP 500 on ISR pages** (not CSR
   fallback). Wrap `<PostPages>` in Suspense (`DocumentPageRenderer.tsx:129`;
   also `useDrawerOpen`, `PublishedPageBlock`). Keep the modal Suspense from
   the old (app) layout. Gate rule: no bare useSearchParams in (published).
   Reading `searchParams` as a page prop also 500s — don't lift it up.
3. **`revalidate` alone ≠ ISR.** Every (published) page also needs
   `generateStaticParams() { return [] }` or it stays fully dynamic.
   Set top-level `expireTime` in next.config (default SWR window is 1 year).
   `subscribe/[did]/[rkey]` accepts handles → canonical-redirect handle→did.
4. **A missed cookies()/headers() read = HTTP 500** (Suspense does NOT rescue
   without cacheComponents). Third hidden read found: all six
   `opengraph-image.ts` → `getCurrentDeploymentDomain` → `headers()` (their
   `revalidate = 86400` has never worked). Fix `getOwnUrl`. Ordering: the
   members-only de-cookie-ing (Stage 2.2) MUST land before `revalidate` is
   added to post pages (2.1), or gated posts 500.
5. **All five `revalidatePath` calls are no-ops today**: ISR cache tags
   include the route-group segment (`_N_T_/(published)/lish/...`) while the
   calls pass group-less patterns. Replace with concrete-path calls (post URL
   + pub home + archive + feeds); pattern+"layout" form would flush every
   publication at once. `publishToPublication.ts` has NO revalidation at all
   (post publish would serve stale pub home/archive/RSS) — add it. Add a test
   asserting revalidatePath args match real cache tags.
6. **SWR key fight**: swr module cache beats fallbackData; a slim/null cache
   entry poisons dashboard first frames and vice versa. Fix: (published)
   provider uses a separate SWR key ("viewer-identity"), seeds from any
   cached full identity for cross-group client navs, never writes null over
   data, and only fetches when a non-httpOnly session-marker cookie exists
   (set/cleared beside auth_token everywhere it's written) so anonymous
   readers and bots trigger zero identity calls. Dashboard provider keeps
   "identity" key + mutate(initialValue) but with `{revalidate:false}` —
   today's unconditional `mutate(initialValue)` triggers a SECOND full
   getIdentityData POST on every page view (live cost bug, fix in Stage 1).
   Slim identity returns the exact Identity shape with []/null fills +
   type-level assertion (several consumers index arrays unguarded).
7. **Six sites use router.refresh() as their only identity refresh**
   (SubscribeButton, EmailSubscribe, ManageSubscribe ×3, SwitchPlanModal) —
   dead on (published) after the split (initialValue prop never changes).
   Add `mutateIdentity()` beside each; ban refresh-as-identity-refresh in
   (published). Unsubscribe (`ManageSubscribe.tsx:210`) is the worst case.
8. **SECURITY (pre-existing, becomes CDN-cacheable): `getPostPageData.ts:245`
   spreads `publications(*)` into client HTML** — includes `draft_leaflet`
   (a permission_tokens.id honored by /[leaflet_id] with NO identity check —
   confirmed in production HTML) and the full subscriber DID list. Replace
   with explicit field projection BEFORE any caching lands.
9. Members-only unlock island is feasible (client tree, mergeable resource
   maps, stable block indices) but needs `LeafletContentProvider` +
   `DocumentProvider` to become stateful so pages + `membersOnly.gated` flip
   atomically; 4 resource prop channels lift into client state; cover
   [rkey], archive-shadowed pages, p/[rkey], l-quote. Skip
   prerenderedCodeBlocks (PubCodeBlock re-highlights on mount). Protect the
   normalize-aliasing invariant (`normalize.ts:284` — splice gates raw +
   normalized in one pass) with a by-reference test.
10. Inline `catch → <pre>{error}</pre>` on pub pages would cache a transient
    DB error as a 200 for the SWR window — rethrow or notFound().
11. Custom domains: don't absolutize the `/icon` favicon (host-relative is
    what lets one ISR entry serve all domains); sitemap/robots need
    `Vary: Host` or record-derived URLs; strip the trailing slash in
    `middleware.ts:117` rewrite (double cache entries).
12. Metadata after split: theme-settings + contributor_accept lose the pub
    title (add own titles); optional 6-line (identity) lish layout for the
    pub favicon. Dashboard/edit/join already self-provide.
13. Dates: first paint becomes UTC/en-US for everyone (day can differ near
    midnight UTC). Accepted for now (80ms self-correction, text-only);
    revisit if gate 2 shows real CLS. `timeAgo`/`PostHeader` render-time
    stamps freeze for the ISR window — acceptable.
14. Misc: remove unused `ShareButton` import in `Interactions.tsx:23` (drags
    editor+Replicache into published bundle); icon route force-dynamic vs
    s-maxage contradiction; gate 1 must assert the build route table (● vs ƒ)
    and curl every published route for non-500.
