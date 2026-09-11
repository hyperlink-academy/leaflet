# Stop the editor page from disabling the fetch cache

You are implementing a small caching fix in the Leaflet repo (Next.js 16.3 App Router). Read `CLAUDE.md` first. This is Tier 2 of the PWA load audit (`plans/pwa/README.md`).

## Context

- `app/(app)/(editor)/[leaflet_id]/page.tsx:21-23` exports `dynamic = "force-dynamic"` and `fetchCache = "force-no-store"`. The route segment config docs (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md`) say `force-no-store` overrides per-fetch `next.revalidate` options for every `fetch` in that render.
- `components/FontLoader.tsx:22` fetches Google Fonts CSS with `next: { revalidate: 60 * 60 * 24 }`, and the editor page renders `FontLoader` (`page.tsx:60`). Under `force-no-store` that fetch is uncached and falls back to the per-instance in-memory memo in `FontLoader.tsx:34-46`, so every cold function instance re-fetches Google Fonts before the editor can stream.
- In Next 15 and 16, `fetch` is not cached by default; the `force-no-store` export was presumably added under an older default. The same export appears in `[leaflet_id]/publish/page.tsx:12`, `lish/[did]/[publication]/edit/page.tsx:23`, `(identity)/new/route.ts:5`, `app/template/[template_id]/route.ts:8`, `home/icon.tsx:13`, and `(editor)/[leaflet_id]/icon.tsx:10-13` uses `default-no-store`.
- Supabase queries on these pages go through `supabase-js`, which uses `fetch` internally. Confirm whether the server client passes an explicit `cache` option (read `supabase/serverClient.ts`); if it does not, it relies on the framework default, which is uncached.

## Goal

Per-fetch `next.revalidate` opt-ins work on the editor page (and the other listed routes) while every query that must be fresh stays fresh.

## Steps

1. Read the `fetchCache` section of the segment config docs and `01-app/01-getting-started/06-fetching-data.md` to confirm the current default for `fetch` in this version. Quote the sentence in the commit message.
2. Remove `export const fetchCache = "force-no-store"` from `(editor)/[leaflet_id]/page.tsx`. Keep `dynamic = "force-dynamic"`.
3. If `supabase/serverClient.ts` does not set `cache: "no-store"` on its fetch, add it there explicitly so Supabase reads never depend on a segment config. Do the same for any other server-side client (`supabase/pool.ts` uses `pg`, not fetch).
4. Apply the same removal to the other `force-no-store` sites listed above after checking each file's fetches: if a file has no `fetch` with `next.revalidate`, the export is harmless but misleading; remove it for consistency and say so in the commit. Leave `(editor)/[leaflet_id]/icon.tsx` alone unless it is clearly the same case.
5. Verify `FontLoader`'s cache now works: temporarily set `logging: { fetches: { fullUrl: true } }` in `next.config.js`, run `npm run dev`, open a leaflet with a non-default theme font twice, and confirm the second render logs a cache HIT for the Google Fonts URL. Remove the logging setting before committing.

## Verification

- `rm -rf .next/dev/types && npx tsc`; `npm run test:unit`; `npm run check-published-purity`; `npm run format:changed`.
- Editor still reflects a fresh document on reload after an edit from another browser (proves Supabase reads are uncached).
- Editor with a Google Font theme renders with the font on first paint.

## Working rules

- Follow `CLAUDE.md` comment rules.
- Branch off `main`. One commit. Do not push or open a PR.
- Final report: the docs sentence relied on, the list of files changed, the fetch log evidence, and anything you could not verify.
