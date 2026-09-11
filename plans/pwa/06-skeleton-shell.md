# Replace the cold-load spinner with a dashboard skeleton

You are implementing a perceived-performance change in the Leaflet repo (Next.js 16.3 App Router, React 19, Tailwind v4). Read `CLAUDE.md` first. This is Tier 2 of the PWA load audit (`plans/pwa/README.md`).

## Context

On a cold load of any dashboard route the first paint is `FullPageLoading` (`components/PageLayouts/DashboardLoading.tsx:22-28`): a full-viewport centered spinner. It is the Suspense fallback in `app/(app)/(identity)/layout.tsx:35` and again in `app/(app)/(identity)/(home-pages)/layout.tsx:23` and `reader/layout.tsx:18`. The comments in those files explain why the boundaries exist (a sync layout with request-coupled work in a suspended child is the only committable shell the group has) and must stay.

The real shell is `components/PageLayouts/DashboardShell.tsx`: a wrapper `div.dashboard.pwa-padding ... flex sm:flex-row flex-col ...`, `DesktopNavigation` (sidebar with page title, actions, tabs, publication list, writer and reader buttons) on the left at `sm` and up, a mobile header otherwise, and the content column. `/home` content is `HomeLayout.tsx`'s grid (`md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-y-4 gap-x-4 sm:gap-x-6 sm:gap-y-5`) of leaflet cards. `/reader` already has a content skeleton (`reader/FeedSkeleton.tsx`, three pulsing rows) used by both its `loading.tsx` and its Suspense fallback.

Per-segment `loading.tsx` files (`home`, `reader`, `notifications`, `looseleafs`, `memberships`, `p/[didOrHandle]`, `tag/[tag]`, dashboard `subs`) render `DashboardLoading`, a content-column spinner; those only show on client navigations and stay as they are.

Theme: dashboard colors come from home-leaflet facts, so on a cold load the skeleton renders in the default theme until plan 04 Stage 2 lands. That is acceptable; the spinner has the same limitation today.

## Goal

The cold-load fallback for dashboard routes is a static skeleton with the same geometry as the loaded page: sidebar column with title, action, and tab placeholders; content column with a card grid on `/home`-style routes and the existing feed skeleton on `/reader`. When the real page commits, nothing moves.

## Steps

1. Build `components/PageLayouts/DashboardSkeleton.tsx` as a server-renderable component (no hooks, no client state) that reuses `DashboardShell`'s wrapper classes exactly (copy them; do not import the client shell) and reserves the same widths: read `DesktopNavigation` and `Sidebar` for the sidebar width and padding, and the mobile header height. Placeholders are rounded blocks using existing tokens (`bg-border-light` or whatever `FeedSkeleton` uses) with `animate-pulse`; respect `prefers-reduced-motion` via the existing global CSS if a rule exists, otherwise add `motion-reduce:animate-none`.
2. Give it a `variant` prop: `"grid"` (card grid matching `HomeLayout`'s classes, 8 cards, each with the card's aspect ratio; read `LeafletList/*` for the card dimensions), `"feed"` (render `FeedSkeleton` inside the content column), `"plain"` (content column with the existing `DashboardLoading` spinner).
3. Use it as the fallback in `(identity)/layout.tsx` (`variant="plain"`, since that boundary covers non-dashboard identity routes too, such as publish and checkout; if you can pick the variant from the pathname synchronously without `headers()`, do so, otherwise keep plain), in `(home-pages)/layout.tsx` (`variant="grid"`), and in `reader/layout.tsx` (`variant="feed"`). Keep `FullPageLoading` for any non-dashboard caller.
4. Mobile: the sidebar is a dialog on small screens; the skeleton shows the mobile header bar and the content column only.
5. Do not add the skeleton to per-segment `loading.tsx` files; those already sit inside the mounted shell.

## Verification

- `rm -rf .next/dev/types && npx tsc`; `npm run format:changed`.
- With `npm run dev`, throttle to Slow 3G, log in, hard-reload `/home`, `/reader`, `/notifications`, and a publication dashboard. Record a Performance trace and confirm no layout shift when the real page replaces the skeleton (Layout Shift entries in the trace, or the CLS overlay in the Rendering panel). Repeat at 400 px width.
- Screenshot skeleton vs loaded page for `/home` at desktop and mobile widths and include them in the report.

## Working rules

- Follow `CLAUDE.md` comment rules.
- Branch off `main`. One commit. Do not push or open a PR.
- Final report: which boundaries changed, the layout-shift result, screenshots, and anything you could not verify.
