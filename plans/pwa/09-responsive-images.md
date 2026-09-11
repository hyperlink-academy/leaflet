# Responsive images on published pages

You are implementing an image-loading change in the Leaflet repo (Next.js 16.3 App Router; images served via our own resize routes that 302 to Supabase's CDN). Read `CLAUDE.md` first. This is Tier 2 of the PWA load audit (`plans/pwa/README.md`).

## Context

- Published pages render plain `<img>` elements with URLs from `src/utils/blobRefToSrc.ts`. `blobRefToSrc(ref, did, baseUrl?, transform?)` accepts `width`, `height`, and `format`, and `/api/atproto_images` (or `/api/resized_images` for draft images) resizes with sharp, stores the variant, and redirects. Display widths are `COVER_THUMBNAIL_WIDTH = { large: 800, medium: 360 }` and `POST_BODY_IMAGE_WIDTH = 1200` (`blobRefToSrc.ts:58,63`). The size ladder used elsewhere is `supabase/imageSizes.js` (`[360, 800, 1200, 2000]`).
- Post-list cover thumbnails: `app/(app)/(published)/lish/[did]/[publication]/PublicationPostItem/PublicationPostItemLarge.tsx` (around line 26) and `PublicationPostItemMedium.tsx` (around line 73) render `<img>` with no `width`/`height`, no `sizes`/`srcset`, no `loading`, sized purely by CSS (`aspect-[3/2]`, `w-24 sm:w-36`). The medium variant renders a 360 px source into a 96–144 px box; the large one an 800 px source into a `sm:h-[254px]` box. Callers pass the width via `PublicationPostsList.tsx:197`, `components/PostListing.tsx:94`, `components/Blocks/StandardSitePostBlock/StandardSitePostItem.tsx:186`, and `src/utils/chapterGrouping.ts:149`.
- Post body images: `app/(app)/(published)/lish/[did]/[publication]/[rkey]/Blocks/PublishedImageBlock.tsx:40-48` renders one fixed 1200 px source, has `width`/`height`, `decoding="async"`, and a caller-supplied optional `loading`. No `srcset`.
- The only `fetchPriority` in the codebase is `"low"` (`components/ActionBar/Publications.tsx:206`). No page marks its first cover or hero image high priority.
- The editor's `ImageBlock.tsx:236` uses `next/image` with a custom loader; Next 16 deprecates its `priority` prop in favor of `preload`. It is out of scope here.
- Emails (`emails/`) have their own constraints and are out of scope.

## Goal

Post-list thumbnails and post-body images ship a `srcset` built from the existing size ladder with an accurate `sizes`, carry intrinsic dimensions or an aspect ratio so they do not shift layout, lazy-load below the fold, and the first visible cover on a page is fetched at high priority.

## Steps

1. **Helper.** Add `blobRefToSrcSet(ref, did, widths, transform?)` next to `blobRefToSrc` that returns a `srcset` string using only ladder widths (so variants dedupe with what the resize routes already produce). Add a small `coverSizes` map for the two thumbnail variants and one for the post body (`(min-width: 640px) 600px, 100vw` or whatever the content column actually is; read the layout).
2. **Thumbnails.** In both `PublicationPostItem*` components and `StandardSitePostItem.tsx`, `PostListing.tsx`: add `srcset` + `sizes`, `width`/`height` (or an inline `aspect-ratio` when the record carries `aspectRatio`; check the cover-image lexicon in `lexicons/src/` for the field), `decoding="async"`, and `loading="lazy"` for items after the first two in a list. Keep the existing `blobRefToSrc` call as the `src` fallback.
3. **Post body.** In `PublishedImageBlock.tsx`, add `srcset` from widths `[800, 1200, 2000]` and a `sizes` matching the column; keep `loading` caller-driven and make sure the first image block in a post gets `loading="eager"` and `fetchPriority="high"` from `PostContent.tsx`.
4. **Publication home hero / first cover.** Where a publication home renders a first large cover above the fold (`PublicationPostsList.tsx` large variant), set `fetchPriority="high"` on the first one only.
5. **Resize route check.** Read `app/api/atproto_images/route.ts` and `app/api/resized_images/route.ts` to confirm they accept each ladder width and that variant paths are keyed by width, so no new variant explosion occurs. If a route snaps widths, use the snapped set.

## Verification

- `rm -rf .next/dev/types && npx tsc`; `npm run check-published-purity`; `npm run format:changed`.
- On a publication home and a post with several images, in DevTools: Network shows the medium thumbnails requesting the 360 variant at 1x and nothing larger; the first cover has priority High; below-fold images load on scroll. Rendering → Layout Shift Regions shows none when images arrive.
- Lighthouse on a published post before and after: report LCP and CLS.

## Working rules

- Follow `CLAUDE.md` comment rules.
- Branch off `main`. Commit helper, thumbnails, and body separately. Do not push or open a PR.
- Final report: components changed, the Lighthouse numbers, and anything you could not verify.
