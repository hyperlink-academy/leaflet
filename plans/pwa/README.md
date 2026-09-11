# PWA load performance plans

Implementation prompts derived from the PWA load audit of 2026-09-10 (full audit: https://claude.ai/code/artifact/076977f5-1f44-4457-bac0-f7359ebe281d). Each file is written to be handed to an agent as-is: it carries its own context, goal, steps, verification, and working rules. Tier 3 (native-feel polish) is not planned here yet.

## Tier 1: remove the structural delays

| #   | Plan                                                     | Depends on                               |
| --- | -------------------------------------------------------- | ---------------------------------------- |
| 01  | [Cut the client bundle](01-bundle-cuts.md)               | none                                     |
| 02  | [Cache and slim the identity path](02-identity-cache.md) | none                                     |
| 03  | [Real service worker](03-service-worker.md)              | 01 (so the cached assets are small)      |
| 04  | [Boot /home from local data](04-local-first-boot.md)     | 01, 02, 03, 05; stages 3–4 need sign-off |

## Tier 2: cheap, independent wins

| #   | Plan                                                                     | Depends on                     |
| --- | ------------------------------------------------------------------------ | ------------------------------ |
| 05  | [Wasted mount requests and prefetch timing](05-wasted-mount-requests.md) | 02 for one step (noted inside) |
| 06  | [Skeleton shell](06-skeleton-shell.md)                                   | none                           |
| 07  | [Asset headers and sizes](07-asset-headers.md)                           | none                           |
| 08  | [Editor fetch cache](08-editor-fetch-cache.md)                           | none                           |
| 09  | [Responsive images](09-responsive-images.md)                             | none                           |
| 10  | [Cacheable RPC reads](10-cacheable-rpc-reads.md)                         | none                           |
| 11  | [Reader feeds](11-reader-feed.md)                                        | 02 optional                    |
| 12  | [Config hygiene](12-config-hygiene.md)                                   | none                           |

## Suggested order

1. 04 Stage 1 (launch instrumentation) so every later change has a before number. It is independent of the rest of 04.
2. 01, then 05 and 06. These change what the user sees on a cold launch the most, with no architectural risk.
3. 02, then 11.
4. 07, 08, 09, 10, 12 in any order; they are small and independent.
5. 3.
6. 04 Stage 2, then a decision on Stage 3 vs Stage 4.

## Conventions shared by every plan

- Read `CLAUDE.md` before starting; its comment rules and the `"use server"` endpoint rule apply everywhere.
- Before trusting `npx tsc`, run `rm -rf .next/dev/types`; stale generated types can silently disable checking.
- Standard checks: `npm run test:unit`, `npm run check-published-purity`, `npm run check-query-plans` when a Supabase query changed, `npm run format:changed`.
- Never edit generated files: `lexicons/pub/`, `lexicons/api/`, `supabase/database.types.ts`.
- Branch off `main`, commit per step, do not push or open a PR. Report what was verified and what was not.
