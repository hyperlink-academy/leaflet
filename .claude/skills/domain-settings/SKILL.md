---
name: domain-settings
description: Keep the three custom-domain surfaces in sync — profile domain settings, publication domain settings, and the leaflet share-menu domain picker. Use whenever you change how domains are listed, verified, assigned, unassigned, or deleted in any one of them, since each surface hand-rolls its own row UI over the same data and drifts silently.
user-invocable: true
---

# Custom domain settings

A custom domain is one row of `custom_domains`, reachable from **three** places that each
render their own row markup over the same identity data and the same
`useDomainStatus` / `DomainVerification` pieces. Nothing is shared below the data layer,
so a change to one surface leaves the other two looking and behaving differently, with no
type error and nothing failing in CI.

## The three surfaces

| # | Surface | Entry point | Rows |
|---|---|---|---|
| 1 | Profile domain settings (`/settings?tab=domains`) | `app/(app)/(identity)/(home-pages)/(writer)/settings/domains/DomainTab.tsx` | `PublicationDomain.tsx`, `LeafletDomain.tsx`, `UnassignedDomain.tsx` |
| 2 | Publication domain settings (dashboard → settings) | `app/(app)/(identity)/lish/[did]/[publication]/dashboard/settings/PubDomainSettings.tsx` | `PubDomainRow` (current/default + alternates), `UnassignedDomainRow` (available) |
| 3 | Leaflet share menu → custom domain | `app/(app)/(editor)/[leaflet_id]/actions/ShareOptions/DomainOptions.tsx` | `LinkedDomainOption`, `NonLinkedDomainRow`, plus `VerifyDomainView` |

Surface 1 is the only place a domain is **added** (`AddDomainForm`) or **deleted**
(`DeleteDomainButton`). Surfaces 2 and 3 only assign/unassign an existing domain.

Surfaces 1 and 2 open verification through `DomainVerificationModal`, exported from
`settings/domains/DomainVerification.tsx` — pass it `domain` and a `trigger`; it owns
the modal title, width, and `DomainVerification` body. Don't re-wrap `Modal` +
`DomainVerification` by hand in either place.

Surface 3 deliberately does **not** use that modal: it lives in the share popover and swaps
the menu to its own `VerifyDomainView` via
`setDomainMenuState({ state: "domain-settings", domain })`. Leave it that way unless asked.
So an "open the verification UI" change is expressed twice — once as a
`DomainVerificationModal` trigger, once as a menu-state transition.

## What they share

- `useDomainStatus(domain)` (`settings/domains/useDomainStatus.ts`) — SWR on
  `get_domain_status`; `pending` is truthy while the domain is misconfigured or awaiting
  DNS verification. One hook call per row, so it must be called from the row component.
- `useDomainStatuses(domains)` (same file) — the list-level version, one SWR key for the
  whole list, used when a surface needs to **bucket or order rows by verification state**
  (surface 3 separates unverified rows from available ones with it). It seeds the
  per-domain `domain-status-${domain}` keys, so a row or view that later calls
  `useDomainStatus` reads from cache instead of refetching. Don't call `useDomainStatus`
  in a loop to get the same thing — the hook count has to stay stable as domains are
  added and deleted.
- `DomainVerification` (`settings/domains/DomainVerification.tsx`) — the DNS record table.
  **Returns `null` when not pending.** Never make a row that opens it unconditionally, or a
  verified domain opens an empty modal/view.
- `DomainVerificationModal` (same file) — the modal wrapper around it, used by surfaces 1
  and 2 (see above).
- `getDomainAssignment` / `describeAssignment` (`settings/domains/domainAssignment.ts`) —
  classifies a domain as `publication` / `document` / `unassigned`. Surface 1 buckets its
  sections with it; surface 2 uses it for the reassign confirmation. Surface 3 filters by
  hand (`publication_domains.length === 0`, then route match on `permission_token.id`)
  instead of using it — so a change to what counts as "assigned" needs applying there too.
- Server actions in `actions/domains/index.ts`: `addDomain`, `assignDomainToDocument`,
  `assignDomainToPublication`, `removeDomainAssignment`, `removeDomainRoute`,
  `deleteDomain`.
- Data source: `identity.custom_domains` via `useIdentityData` (surfaces 1, 2, 3) plus
  `publication_domains` from `usePublicationData` (surface 2) and `useLeafletDomains`
  (surface 3). Optimistic updates go through `mutateIdentityData(mutateIdentity, draft => …)`;
  after a write, mutate **every** cache the surface reads, or the row snaps back.

## Current conventions (keep these consistent across all three)

- An unverified domain row: the **domain name pulses** (`animate-pulse`) and is
  **`font-normal`** (verified domains are the bold ones); the affordance reads **`Verify`**
  in `text-accent-contrast font-bold` — not "pending", not "unverified", not a spinner, and
  the label itself doesn't pulse.
- The **whole row** is the trigger: a single `<button type="button">` wrapping name +
  label, passed to `Modal` with `asChild` (surfaces 1, 2) or wired to the menu-state
  transition (surface 3). Per project convention, a button used as a `Modal`/`Popover`
  trigger always gets `asChild`.
- A row that also holds its own control (surface 1's `DeleteDomainButton`) keeps that
  control **outside** the trigger button — don't nest buttons, and don't rely on
  `stopPropagation` to untangle two nested triggers.
- Verified-but-unassigned rows are not clickable-to-verify; they show the assign
  affordance (surface 2's `assign`, surface 3's route input) or plain text (surface 1).
- Grouping unverified rows above the rest, separated by an `hr`, is **surface 3 only** by
  decision. Surfaces 1 and 2 leave unverified rows interleaved in list order.

## Required step: ask about the other two

**Any change to domain row UI or behavior in one surface is a three-surface change until
the user says otherwise.** After making the change, use `AskUserQuestion` to ask whether
the same change should be applied to the other two surfaces — name them specifically
(e.g. "also apply to the leaflet share menu picker and the publication dashboard rows?")
and say what the equivalent would be in each, since the mechanics differ (modal vs.
menu-state, assign vs. publish-to-route). Don't silently do all three, and don't silently
do only one.

This applies to: label text, pending/verified states, colors, pulse/animation, what part
of the row is clickable, where verification opens, assign/unassign affordances, empty
states, and the copy in each.

## Verify before calling it done

`npx tsc`. Then, for each surface you touched:

1. An unverified domain — name pulses, `Verify` reads as clickable, clicking anywhere on
   the row opens the DNS record table for **that** domain.
2. A verified domain — no `Verify`, no pulse, and the assign/publish affordance works.
3. Surface 1's delete icon still opens the delete confirmation and doesn't also open
   verification.
4. Surface 3 inside the share popover — the row click swaps to `VerifyDomainView` and the
   back arrow returns to the picker (rows there use `onMouseDown`, which the popover
   needs; don't switch it to `onClick` without checking the popover doesn't eat it).
