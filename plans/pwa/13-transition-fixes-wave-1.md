# 13 — Fix the wave 1 transition-review findings

The wave 1 transition review (`_ws/logs/integration/transitions-wave-1.md`,
read it in full first) found 15 issues, 3 blocker-grade:

1. `components/Blocks/renderMath.ts` — the only `katex.min.css` import moved
   behind a dynamic import that `StaticMathBlock.tsx` skips when the server
   prerendered the math, so prerendered formulas on published posts have no
   KaTeX stylesheet. (Introduced by plan 01.)
2. `app/api/rpc/lib.ts` — `stale-while-revalidate=600` on the browser-facing
   `Cache-Control` lets `get_document_recommends` / `get_document_interactions`
   serve pre-write bodies for up to 10 minutes, reverting optimistic
   recommends and just-posted comments. (Plan 10.)
3. `app/(app)/(identity)/(home-pages)/layout.tsx` — the shared loading
   boundary hard-codes the `/home` card-grid skeleton, so `/reader`,
   `/tag/*` and `/p/*` cold-load behind a grid of leaflet cards that morphs
   into a feed. (Plan 06.)

## Do

- Fix all three blockers. For each, choose the smallest structural fix:
  1. ship the KaTeX stylesheet on every path that renders math (a static
     import in the block that renders prerendered HTML, or a `<link>` on
     the published page when the post has math), without pulling the KaTeX
     JS back into non-math routes; re-check the measurement table.
  2. per-route cache policy: reads that back optimistic UI get
     `max-age=0` / no browser SWR (or are excluded from GET caching); keep
     the CDN `s-maxage` where the RPC is genuinely static. Verify with curl
     on the task port.
  3. per-route skeletons: `/reader`, `/tag`, `/p` get the feed skeleton
     that already exists (`FeedSkeleton` / `DashboardSkeleton` variants) or
     no skeleton, via per-segment `loading.tsx` rather than one shared
     boundary guessing the layout.
- Triage the 12 non-blocker findings: fix any whose fix is ≤10 lines and
  local; list the rest in the report with a one-line reason to defer.
- Task 01b concurrently rewrites `(writer)/home/LeafletList/*`; do not edit
  those files. Task 02b concurrently edits `actions/getIdentityData.ts`,
  `src/identityCache.ts`, `components/IdentityProvider.tsx`; do not edit
  those either.

## Verification

`verify.sh` with build; the measurement table must not regress by more than
2 KB on any route; curl the two RPC GETs and show the headers; `next start`
and load `/reader` cold to confirm the skeleton matches the feed layout.
