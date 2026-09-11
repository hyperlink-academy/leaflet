# Cut the client bundle on the main app surfaces

You are implementing a performance change in the Leaflet repo (Next.js 16.3 App Router, Turbopack, React 19, React Compiler on). Read `CLAUDE.md` first. This is Tier 1, item 1 of the PWA load audit (`plans/pwa/README.md`).

## Context

A production build shows every main surface ships roughly the same JavaScript, with no route-level splitting:

| Route                    | Raw      | Gzip     |
| ------------------------ | -------- | -------- |
| `/home`                  | 4,532 KB | 1,333 KB |
| `/reader`                | 4,455 KB | 1,306 KB |
| `/[leaflet_id]` (editor) | 4,566 KB | 1,343 KB |
| published post           | 4,520 KB | 1,323 KB |
| `/` (landing)            | 1,981 KB | 519 KB   |

Two chunks explain almost all of it:

1. **A ~1 MB raw chunk entered at the root layout**, so it reaches every page including the landing page. Chain: `app/layout.tsx` imports `StaleClientNotice` from `components/Blocks/TextBlock/schemaVersion.tsx`, which imports `yjs` and `components/Blocks/TextBlock/schema.ts`; the schema imports `src/utils/mentionUtils.ts`, which imports `AtUri` from `@atproto/api`. That import pulls in the whole `@atproto/api` lexicon bundle (~555 KB pre-minify). `@atproto/syntax` (already a dependency) exports the same `AtUri` class; `@atproto/api` re-exports it from there.
2. **A ~2.15 MB raw / 673 KB gzip "block editor" chunk** that reaches every app route. It holds all 23 block renderers, ProseMirror, tiptap, KaTeX (510 KB), shiki core, parse5 plus the unified/remark/rehype paste pipeline, `@dnd-kit`, `capnweb`, and both builds of `react-dom/server` (~390 KB). Chains into `/home`:
   - `app/(app)/(identity)/(home-pages)/(writer)/WriterShell.tsx` → `home/Actions/Actions.tsx` → `HomeThemeSetter.tsx` → `components/ThemeManager/ThemeSetter.tsx` (`ThemeSetterContent`) → `Pickers/PageThemePickers.tsx` → `components/Canvas.tsx` → `components/Blocks/Block.tsx` (every block type).
   - `home/LeafletList/LeafletContent.tsx:2,6` → `components/Blocks/PageLinkBlock.tsx` (`BlockPreview`) and `components/Canvas.tsx` → `Block.tsx`; `PageLinkBlock.tsx:8` also imports `RenderedTextBlock` from `components/Blocks/TextBlock/index.tsx`, which statically imports `prosemirror-view`, `prosemirror-state`, the command bar, mentions, and the Bluesky post editor.
   - `/reader`: `components/PostListing.tsx:24` → `Interactions/DiscussionButton.tsx:9` → `Interactions/DiscussionModal.tsx:9-12` → published `Interactions/Quotes.tsx` and `Comments` → `PostContent.tsx` → `Blocks/PublishedPageBlock.tsx` → `components/Canvas.tsx` → `Block.tsx`; and `Comments` → `BlueskyEmbed.tsx` → `components/Pages/Page.tsx` → `Toolbar` → `src/utils/copySelection.ts:1-2` → `src/utils/getBlocksAsHTML.tsx:4,8` (`react-dom/server`, `katex`) and `src/htmlMarkdownParsers.ts` (unified/remark/rehype/parse5).

Only three things are code-split today: `Comments/index.tsx:29` (`CommentBox`), `components/BlueskyPostComposer/BskyPostSubmit.tsx:17,40`, and `components/Blocks/BlueskyPostBlock/BlueskyVideoPlayer.tsx:36` (`hls.js`). There is no `React.lazy` anywhere and no `dynamic()` under `components/Blocks/`.

Server-only code also leaks: `src/replicache/utils.ts:1-7` value-imports `drizzle-orm` and `drizzle/schema` for `getClientGroup`, and that module is reachable from the client mutation context, so ~45 KB of drizzle ships to browsers.

## Goal

- `/home` first-load JS under 600 KB gzip (from 1,333 KB). `/reader` similar.
- `/` landing under 250 KB gzip.
- Editor and published post shed `react-dom/server`, the paste parsers, KaTeX, and shiki from their entry chunks (loaded on first use instead).
- No behavior or visual change. Loading placeholders where something now loads lazily are acceptable if brief and non-jumping.

## Non-goals

- Do not restructure the editor's block model, `BlockTypeMap`, or `blockDispatch.ts`. The exhaustive maps are tsc-enforced on purpose.
- Do not touch `lexicons/`, `appview/`, `feeds/`, `emails/`.
- Do not change `next.config.js` chunking knobs. Import-graph fixes first; config tuning is a separate decision.

## Measure first

1. Create `scripts/measure-first-load.mjs` from the appendix below and add `"measure-first-load": "node scripts/measure-first-load.mjs"` to `package.json` scripts.
2. Run `npx next build` (Turbopack; no DB access needed since every `generateStaticParams` returns `[]`), then `npm run measure-first-load`. Record the baseline table in your final report.
3. For composition, run `npx next experimental-analyze --output` and inspect `.next/diagnostics/analyze/`. Use it whenever a chunk stays larger than expected to find the chain that keeps a module in.

Re-run both after every phase. Each phase ends with a commit that includes the before/after numbers in its message body.

## Phase A: the root-layout chain

1. Move `StaleClientNotice`, `useStaleClient`, and `markClientStale` out of `components/Blocks/TextBlock/schemaVersion.tsx` into a new `components/StaleClientNotice.tsx` that imports only zustand and `components/Toast`. `schemaVersion.tsx` keeps the yjs helpers and imports `markClientStale` from the new module. Update `app/layout.tsx` and any other importer (`components/Footnotes/FootnoteEditor.tsx`, `src/yjsRealtime.tsx` import from `schemaVersion`; check what each needs).
2. In `src/utils/mentionUtils.ts:1` import `AtUri` from `@atproto/syntax` instead of `@atproto/api`. Do the same swap in the other client-reachable files that only need `AtUri`: `components/PostListing.tsx:2`, `components/Blocks/StandardSitePublicationBlock/StandardSitePublicationItem.tsx:2`, `components/Blocks/StandardSitePostBlock/StandardSitePostItem.tsx:2`, `components/ThemeManager/PublicationThemeProvider.tsx:7`, `src/utils/chapterGrouping.ts:16`, `src/utils/enrichPost.ts:1`, `src/utils/resolveBylineProfiles.ts:1`.
3. Convert imports that only use types to `import type`: check `components/Blocks/BlueskyPostBlock/BlueskyEmbed.tsx:1`, `components/Blocks/BlueskyPostBlock/index.tsx:8`, `components/BlueskyPostComposer/BlueskyPostComposer.tsx:3`, `src/utils/bskyPostEmbed.ts:1`, `src/utils/factsToPagesRecord.ts:3` (`$Typed` is a type; `UnicodeString` is a value, so that one may need to stay).
4. Rebuild and measure. The root layout entry should drop by roughly 600 KB raw. If `@atproto/api` is still in the root entry, use the analyzer to find the remaining chain and fix it the same way. Remaining genuine runtime users (`RichText`, `Agent`, `AtpAgent`, `UnicodeString`, `BlobRef`) live on editor and Bluesky paths and are handled by Phase C's lazy loading or left alone.
5. Leave `components/Toast.tsx`'s `@react-spring/web` import alone (22 KB, used for animation on every page).

## Phase B: keep the editor out of `/home`

The card previews and the theme setter are the two chains.

1. **Preview renderer.** Extract `RenderedTextBlock` (`components/Blocks/TextBlock/index.tsx:135`) into its own module `components/Blocks/TextBlock/RenderedTextBlock.tsx` whose imports are limited to `src/replicache` hooks, `RenderYJSFragment`, and styling helpers. Have `TextBlock/index.tsx` re-export it so existing importers keep working. Then read what `BlockPreview` in `components/Blocks/PageLinkBlock.tsx` actually renders per block type and build a read-only preview renderer (for example `components/Blocks/PreviewBlocks.tsx`) that `LeafletContent.tsx` and `PageLinkBlock` previews use. It must not import `Block.tsx`, `TextBlock/index.tsx`, or `components/Canvas.tsx`. Text, heading, blockquote go through `RenderedTextBlock`; images through a light `<img>` with the existing thumbhash fallback; page links and cards through a minimal card; other types through a small typed placeholder. Keep the current visual output for the common types.
   - `LeafletContent.tsx:6` also imports `CanvasContent` for canvas-type previews. Either give the preview renderer a canvas variant that doesn't import `Block.tsx`, or lazy-load the canvas preview with `next/dynamic` inside a client component.
2. **Theme setter.** In `home/Actions/HomeThemeSetter.tsx` load `ThemeSetterContent` with `next/dynamic` (client component; `ssr: false` is fine because it lives inside a popover). Confirm nothing else on the `/home` tree statically imports `ThemeSetter` or `Pickers/*`.
3. **/reader.** In `components/Interactions/DiscussionButton.tsx:9` load `DiscussionModal` with `next/dynamic`. Check `components/PostListing.tsx:26` (`PublicationPostItemLarge` from the published group) stays light after the change; if it drags `PostContent` in, lazy-load at that boundary too.
4. Rebuild and measure. The block chunk must no longer appear in the `/home`, `/reader`, `/notifications`, or `/p/[didOrHandle]` entries. If it does, use the analyzer's chain view to find the remaining import and either lazy-load it or split the module.

## Phase C: heavy dependencies at their point of use

Each of these becomes an `import()` at the call site or a `next/dynamic` component. Make functions async where needed; callers are already async in most cases.

1. **KaTeX.** `components/Blocks/MathBlock.tsx:4` (`Katex.renderToString` in a `useMemo`) → load `katex` in an effect and render the HTML once resolved; keep the raw TeX visible meanwhile so nothing jumps. For the published `StaticMathBlock.tsx`, mirror how code blocks are prerendered on the server in `app/(app)/(published)/lish/[did]/[publication]/[rkey]/extractCodeBlocks.ts`: render KaTeX HTML on the server and pass `prerenderedHtml` down, so published pages need no KaTeX on the client at all. `src/utils/getBlocksAsHTML.tsx:8` → `await import("katex")` inside the function.
2. **KaTeX CSS.** `katex/dist/katex.min.css` is imported in `MathBlock.tsx:2`, `CodeBlock.tsx:8`, and `StaticMathBlock.tsx:3`, which puts a 25 KB CSS file with 60 `@font-face` rules in the entry CSS of 28 routes. Remove it from `CodeBlock.tsx` unless something there needs it. Move the remaining imports into the lazily loaded math component so the CSS chunk ships only with it.
3. **shiki.** `components/Blocks/CodeBlock.tsx:1-6` and `.../Blocks/PubCodeBlock.tsx:5` import `codeToHtml`, `bundledLanguagesInfo`, `bundledThemesInfo` statically. Load `shiki` with `await import("shiki")` inside the highlight effect. `PubCodeBlock` already receives `prerenderedCode`; only import shiki when it's missing or the theme changes.
4. **`react-dom/server`.** `src/utils/getBlocksAsHTML.tsx:4` and `src/utils/renderFootnoteDefHTML.tsx:1` import `renderToStaticMarkup`. Switch to `await import("react-dom/server")` at call time. Check `components/Blocks/TextBlock/RenderYJSFragment.tsx` (it imports from `renderFootnoteDefHTML`): if that import is a value import used during normal text rendering, it drags `react-dom/server` into every text block, so restructure so the footnote-definition HTML path is only reached from copy/paste.
5. **Paste and copy parsers.** `src/htmlMarkdownParsers.ts` (unified, remark, rehype, parse5) is imported by `components/Blocks/TextBlock/useHandlePaste.ts:18` and `src/utils/copySelection.ts:2`. Import it with `await import("src/htmlMarkdownParsers")` inside the paste and copy handlers. The paste handler has a large test suite under `src/utils/paste/`; keep those tests passing.
6. **`capnweb`.** `src/hooks/useIframeChannel.ts:2`; used by `components/Blocks/EmbedBlock.tsx` and published `PostContent.tsx`. Dynamic-import inside the hook when an embed actually mounts.
7. **Editor block map (optional, do last).** In `components/Blocks/Block.tsx:417-443`, the `BlockTypeComponents` map can point rare heavy types (`code`, `math`, `bluesky-post`, `embed`, `html`) at `next/dynamic` wrappers with a same-height placeholder. Keep the map's keys and the `Fact<"block/type">` exhaustiveness intact. Skip this if Phases A–C already reach the goal; the editor legitimately needs most of this code.

## Phase D: stop the server leak

Split `src/replicache/utils.ts`: move `getClientGroup` and its drizzle imports (`PostgresJsDatabase`, `driz`, `replicache_clients`, `PgTransaction`) to a server-only module (for example `src/replicache/serverUtils.ts`) and update its importers (grep `getClientGroup`). Leave `FactWithIndexes`, `scanIndex`, `scanIndexLocal`, and the types in `utils.ts` with type-only imports. Confirm with the analyzer that `drizzle-orm` and `drizzle/schema` are gone from all client chunks.

## Verification

- `rm -rf .next/dev/types && npx tsc` (stale generated types can mask errors).
- `npm run test:unit`, `npm run check-published-purity`, `npm run format:changed`.
- `npx next build` then `npm run measure-first-load`: report the before/after table for every route in the script. State which phase produced each drop.
- `npx next experimental-analyze --output`: list every module over 50 KB that remains in the `/home` entry, with a one-line justification each.
- Manual, with `npm run dev`: open `/home` and confirm card previews render identically; open the theme setter popover; open a leaflet, type, paste a Markdown snippet and an HTML snippet from a browser, copy a multi-block selection and paste it back, add a math block and a code block; open a published post with a code block and a math block; open the discussion modal from `/reader`. Note any visible loading flash and how long it lasts.
- If any step can't be verified in your environment, say so explicitly rather than reporting it done.

## Working rules

- Follow `CLAUDE.md` comment rules: comment the non-obvious why, never what changed.
- Branch off `main`. One commit per phase with the numbers in the message. Do not push or open a PR.
- Do not edit generated files (`lexicons/pub/`, `lexicons/api/`, `supabase/database.types.ts`).
- Final report: what changed per phase, the measurement table, remaining large modules, and anything you could not verify.

## Appendix: `scripts/measure-first-load.mjs`

```js
// First Load JS per route, from Turbopack's client-reference manifests
// (entryJSFiles) plus the framework runtime in build-manifest rootMainFiles.
// Run after `next build`. Sizes are the emitted chunks, raw and gzip -9.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = path.resolve(process.cwd(), ".next");
const routes = {
  "/": "server/app/page_client-reference-manifest.js",
  "/home":
    "server/app/(app)/(identity)/(home-pages)/(writer)/home/page_client-reference-manifest.js",
  "/notifications":
    "server/app/(app)/(identity)/(home-pages)/(writer)/notifications/page_client-reference-manifest.js",
  "/reader":
    "server/app/(app)/(identity)/(home-pages)/reader/page_client-reference-manifest.js",
  "/reader/trending":
    "server/app/(app)/(identity)/(home-pages)/reader/trending/page_client-reference-manifest.js",
  "/p/[didOrHandle]":
    "server/app/(app)/(identity)/(home-pages)/p/[didOrHandle]/page_client-reference-manifest.js",
  "/[leaflet_id]":
    "server/app/(app)/(editor)/[leaflet_id]/page_client-reference-manifest.js",
  "/lish/[did]/[publication]":
    "server/app/(app)/(published)/lish/[did]/[publication]/page_client-reference-manifest.js",
  "/lish/[did]/[publication]/[rkey]":
    "server/app/(app)/(published)/lish/[did]/[publication]/[rkey]/page_client-reference-manifest.js",
};

const kb = (n) => (n / 1024).toFixed(0).padStart(6) + " KB";
const sizes = new Map();
function size(f) {
  if (!sizes.has(f)) {
    const p = path.join(ROOT, f.replace(/^\/?_next\//, ""));
    try {
      const b = fs.readFileSync(p);
      sizes.set(f, {
        raw: b.length,
        gz: zlib.gzipSync(b, { level: 9 }).length,
      });
    } catch {
      sizes.set(f, { raw: 0, gz: 0 });
    }
  }
  return sizes.get(f);
}
const sum = (files) =>
  files.reduce(
    (a, f) => ({ raw: a.raw + size(f).raw, gz: a.gz + size(f).gz }),
    { raw: 0, gz: 0 },
  );

const bm = JSON.parse(
  fs.readFileSync(path.join(ROOT, "build-manifest.json"), "utf8"),
);
const runtime = sum(bm.rootMainFiles);
console.log(
  `framework runtime (every route): ${bm.rootMainFiles.length} files raw=${kb(runtime.raw)} gz=${kb(runtime.gz)}\n`,
);
console.log("route".padEnd(36), "files", "      raw", "     gzip", "  css gz");

const all = {};
for (const [route, rel] of Object.entries(routes)) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    console.log(route.padEnd(36), "manifest missing");
    continue;
  }
  const src = fs.readFileSync(file, "utf8");
  let json;
  const m = src.match(
    /globalThis\.__RSC_MANIFEST\[("[^"]+")\]\s*=\s*(\{[\s\S]*\})\s*;?\s*$/,
  );
  try {
    json = JSON.parse(m[2]);
  } catch {
    const m2 = src.match(/=\s*JSON\.parse\((".*")\)/s);
    json = JSON.parse(JSON.parse(m2[1]));
  }
  const js = new Set();
  const css = new Set();
  for (const files of Object.values(json.entryJSFiles || {}))
    files.forEach((f) => js.add(f));
  for (const files of Object.values(json.entryCSSFiles || {}))
    files.forEach((f) => css.add(typeof f === "string" ? f : f.path));
  const t = sum([...js]);
  const c = sum([...css]);
  all[route] = { js: [...js], raw: t.raw + runtime.raw, gz: t.gz + runtime.gz };
  console.log(
    route.padEnd(36),
    String(js.size).padStart(5),
    kb(t.raw + runtime.raw),
    kb(t.gz + runtime.gz),
    kb(c.gz),
  );
}

if (process.argv.includes("--chunks")) {
  for (const [route, r] of Object.entries(all)) {
    console.log(`\n${route}`);
    [...r.js]
      .map((f) => ({ f, ...size(f) }))
      .sort((a, b) => b.raw - a.raw)
      .slice(0, 10)
      .forEach((s) => console.log("  ", kb(s.raw), kb(s.gz), s.f));
  }
}
```
