# Cache headers and sizes for static assets

You are implementing a caching change in the Leaflet repo (Next.js 16.3 on Vercel). Read `CLAUDE.md` first. This is Tier 2 of the PWA load audit (`plans/pwa/README.md`).

## Context

- `next.config.js` `headers()` has one rule: `X-Robots-Tag: noindex` on generated OG images. Everything under `public/` is served with Vercel's default for unconfigured static files (revalidating, short-lived), while `/_next/static/**` is immutable for a year automatically.
- `public/imagePlaceholder.png` is 388 KB and is on the editor and published posts-list render path as a CSS `background-image` (`components/Blocks/PostsListBlock.tsx:582,611`, `components/Blocks/PostSizeIcons.tsx:50,66`).
- `public/open-graph.png` is 929 KB. It is the site-wide OG image (`app/layout.tsx:16`) and a screenshot fallback (`src/utils/screenshotPage.ts:118`). Unfurl bots fetch it on every share.
- `public/about/` is 2.4 MB of WebP used only by `/about` (`hero.webp` alone is 780 KB).
- `public/fonts/` holds the two Quattro variable fonts (51 KB and 50 KB). `next/font/local` in `app/layout.tsx:40-52` reads them from that path at build time and emits hashed copies under `/_next/static/media`, so the `public/fonts` URLs are never requested but are deployed.
- The Next docs (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md`) confirm `headers()` can set `Cache-Control` for anything except `/_next/static`.

## Goal

Static assets that the app pages actually load are cached long-term by browsers, the CDN, and the service worker (plan 03), and the two oversized images on hot paths are small.

## Steps

1. **Headers.** In `next.config.js` `headers()`, add rules for `/illustrations/:path*`, `/logos/:path*`, `/templates/:path*`, `/about/:path*`, `/RSVPBackground/:path*`, and the root-level images (`/:file(imagePlaceholder\\.png|open-graph\\.png|transparent-bg\\.png|hatchPattern\\.svg|gripperPattern\\.svg|gripperPattern2\\.svg|gripperPatternVertical\\.svg|timeInputIcon\\.svg|apple-touch-icon\\.png|web-app-manifest-192x192\\.png|web-app-manifest-512x512\\.png)`). Use `public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000`. Do not use `immutable`: these filenames do not change when their content does. Leave `/worker.js` and `/manifest.json` alone (plan 03 and Next handle them).
2. **`imagePlaceholder.png`.** Look at it (`Read` the file to view it). Replace with an equivalent that is a few KB: an inline SVG data URI in the two components if it is a simple pattern, otherwise a WebP at the largest size it is actually displayed at. Update the four references. Delete the PNG if nothing else references it (grep `imagePlaceholder`).
3. **`open-graph.png`.** Re-encode at 1200×630 to under 200 KB (PNG with palette reduction, or JPEG at quality ~85 if it is photographic) using `sharp`, which is already a dependency. Keep the filename and format unless the format changes; if it becomes JPEG, update `app/layout.tsx:16` and `screenshotPage.ts:118`.
4. **`public/about/hero.webp`.** Re-encode to under 250 KB at the displayed size (check `app/about/AboutPage.tsx` for the rendered dimensions). Optional for the other `about/` images; note sizes in the report.
5. **Fonts.** Move `public/fonts/` to `app/fonts/` and update the `localFont` paths in `app/layout.tsx`, so the duplicate public URLs stop being deployed. Check nothing else references `/fonts/` (grep `"/fonts/`).

## Verification

- `npx next build && npx next start`, then `curl -I` each affected path and paste the `cache-control` headers into the report. Confirm `/_next/static/media/*.woff2` still serves the fonts.
- Open a posts-list block in the editor and on a published page; the placeholder must look the same.
- Paste a leaflet.pub link into a Bluesky or Slack composer against a preview deploy and confirm the OG image renders.
- `rm -rf .next/dev/types && npx tsc`; `npm run format:changed`.

## Working rules

- Follow `CLAUDE.md` comment rules. The one comment worth having is on the headers rule: why not `immutable`.
- Branch off `main`. One commit per numbered step. Do not push or open a PR.
- Final report: the header table, before/after byte sizes, and anything you could not verify.
