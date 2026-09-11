# Next 16 config hygiene

You are implementing configuration updates in the Leaflet repo (Next.js 16.3.0, Turbopack, deployed on Vercel). Read `CLAUDE.md` first, including its warning that this Next version differs from training data: read the bundled docs under `node_modules/next/dist/docs/` for every item below before changing it. This is Tier 2 of the PWA load audit (`plans/pwa/README.md`).

## Context and items

1. **`middleware.ts` → `proxy.ts`.** Deprecated in Next 16 (`01-app/03-api-reference/03-file-conventions/middleware.md`, `proxy.md`, `01-app/01-getting-started/16-proxy.md`). Codemod: `npx @next/codemod@canary middleware-to-proxy .`. Proxy runs on the Node runtime by default and a `runtime` export throws. Our `middleware.ts` has no `runtime` export, uses `@vercel/functions` `getCache` and `waitUntil`, a Supabase client, and `decryptCrossSiteToken`. The docs also say proxy "should run before the CDN cache" and is "not intended for slow data fetching"; our custom-domain lookup is cached, so it stays.
2. **`serverExternalPackages`.** Currently `["yjs", "pino", "jsdom"]`. Per `05-config/01-next-config-js/serverExternalPackages.md`, `pino` and `jsdom` are already in Next's default externals list; only `yjs` needs listing. Verify against the list in the doc for this version before trimming.
3. **`deploymentId`.** Not set. Per `deploymentId.md`, a client whose deployment ID differs from the server's hard-navigates instead of failing chunk loads, and server actions from a stale page are handled. Installed-PWA tabs live for weeks, so set `deploymentId: process.env.VERCEL_DEPLOYMENT_ID` (confirm the variable name in Vercel's env docs; fall back to `undefined` locally). Skip if plan 03 already added it.
4. **Security headers from the PWA guide** (`02-guides/progressive-web-apps.md`): `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin` globally. Do not add `X-Frame-Options` or a `frame-ancestors` CSP without first confirming no Leaflet page is legitimately embedded in another origin's iframe (search for `srcDocSandbox`, `useIframeChannel`, and any docs mentioning embeds); if unsure, leave frame headers out and say so.
5. **`experimental.turbopackRustReactCompiler`** (new in 16.3; `05-config/01-next-config-js/` and `08-turbopack.md`): runs the React Compiler natively in Turbopack, build-time only. Try it; keep it if `next build` and `npx tsc` pass and a smoke test of the editor behaves; revert if anything differs.
6. **Bundle analyzer.** `@next/bundle-analyzer` is the webpack-era tool. Leave the wrapper but note in `package.json` scripts a `"analyze": "next experimental-analyze --output"` entry so the Turbopack-native analyzer is the documented path.
7. **Redundant `preferredRegion` re-declarations** in editor, publish, edit, `new/route.ts`, `template/route.ts`, and the icons all repeat the root layout's `["sfo1"]`. Leave them; removing is churn with no effect.
8. **`experimental.staleTimes`.** Still experimental in this version; values are valid. Leave.
9. **`images.qualities`.** Required in 16 for the built-in optimizer, but we use a custom loader. Confirm from `image.md` whether it applies to custom loaders; add `qualities: [75]` only if the docs say it is checked regardless.

## Steps

Do them in the order above, one commit each, quoting the doc sentence you relied on in each commit message. Run the full verification after item 1 and again at the end.

## Verification

- `rm -rf .next/dev/types && npx tsc`; `npm run test:unit`; `npm run check-published-purity`; `npm run check-query-plans`; `npm run format:changed`.
- `npx next build` clean, no deprecation warnings for the items touched.
- Proxy: `npx next start`, then `curl -I -H "Host: leaflet.pub" http://localhost:3000/` (redirect behavior unchanged for `/` with and without an `auth_token` cookie) and, on a preview deploy, a custom-domain publication still rewrites and the cross-site auth callback still logs in.
- Headers: `curl -I` any page shows the two new headers.
- `deploymentId`: on a preview deploy, view source and confirm `?dpl=` on asset URLs.

## Working rules

- Follow `CLAUDE.md` comment rules.
- Branch off `main`. One commit per item. Do not push or open a PR.
- Final report: each item's outcome (done, skipped with reason), doc citations, and anything you could not verify.
