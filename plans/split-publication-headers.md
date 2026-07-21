# Split publication header styles

## Goal

`PublicationStickyHeader` currently conflates two visually different header
treatments behind one component. Split them:

- **With-nav variant** — used when the publication has navigation tabs (the
  published view when `navPages.length > 0`, AND always inside the page
  editor). Visually: simplified header + nav, shrinks on scroll. The `sticky`
  CSS property is optional (the page editor wants `sticky={false}` because its
  scroll layout doesn't need it, but the scroll-shrink behavior should still
  run).
- **No-nav variant** — used only on the published publication homepage when
  there are no publication pages. Visually: the old full header (icon, title,
  description, author, subscribe), scrolls with the page, no `position:
  sticky`, no scroll-shrink animation.

The two components share no behavior — split them rather than threading more
props through one.

## Files affected (all paths relative to repo root)

- `app/lish/[did]/[publication]/PublicationStickyHeader.tsx` — refactored
- `app/lish/[did]/[publication]/PublicationFullHeader.tsx` — **new** (name TBD;
  could also be `PublicationStaticHeader.tsx`)
- `app/lish/[did]/[publication]/PublicationContent.tsx` — branch on `navPages`
- `app/lish/[did]/[publication]/[rkey]/PublicationPageRenderer.tsx` — branch on
  `navPages`
- `app/lish/[did]/[publication]/edit/[[...route]]/layout.tsx` — pass
  `PublicationPagesNav` as the `nav` prop, drop the sibling render

No changes needed to:
- `PublicationHeader.tsx` (inner header, already supports `variant="inline"`
  and `variant="stacked"`)
- `PublicationNav.tsx`
- `PublicationPagesNav.tsx`
- `PublicationHomeLayout.tsx` (already provides the
  `.publicationScrollContainer` for the published view)
- `globals.css` (scroll-shrink CSS rules continue to apply to the with-nav
  variant)

## Step 1 — refactor `PublicationStickyHeader.tsx`

Make this the with-nav variant only.

- Make `nav: React.ReactNode` **required** (drop the `?`).
- Drop `let hasNav = !!props.nav;` and the `if (!hasNav) return;` early bail
  inside the effect — scroll-shrink should always run.
- Keep `sticky?: boolean` (defaults to `true`). The editor passes
  `sticky={false}`.
- Keep the `--header-shrink` writes, the `header-shrunk` toggle, and the
  pathname-reset effect as-is.
- Render unchanged: `<div ref={ref} className={...}>` wrapping
  `{props.children}` then `{props.nav}`.

After this change, the no-nav, no-animation code path no longer exists in this
file.

## Step 2 — new `PublicationFullHeader.tsx`

Drop-in component for the no-nav case. Server component is fine — no scroll
listeners, no `ref`, no `useEffect`.

```tsx
import React from "react";

export function PublicationFullHeader(props: { children: React.ReactNode }) {
  return (
    <div className="pubFullHeader shrink-0">
      <div className="sm:max-w-(--page-width-units) w-full mx-auto px-3 sm:px-4 pt-5">
        {props.children}
      </div>
    </div>
  );
}
```

- No `sticky` class, no `z-10`, no `bg-bg-page`.
- No `--header-shrink` paddingTop math — just static `pt-5` (matches the
  current `calc(20px - 20px * 0)` resting value).
- Callers pass a `<PublicationHeader …/>` (default stacked variant) as
  children, with `description`, `author`, `subscribeButton` populated.

## Step 3 — `PublicationContent.tsx`

Replace the single `PublicationStickyHeader` block (lines ~93–132) with a
branch:

```tsx
stickyHeader={
  navPages.length > 0 ? (
    <PublicationStickyHeader
      nav={
        <PublicationNav
          publicationUrl={getPublicationURL(publication)}
          pages={navPages}
          activePath="/"
        />
      }
    >
      <PublicationHeader
        variant="inline"
        iconUrl={record?.icon ? blobRefToSrc(record.icon.ref, did) : undefined}
        publicationName={publication.name}
      />
    </PublicationStickyHeader>
  ) : (
    <PublicationFullHeader>
      <PublicationHeader
        iconUrl={record?.icon ? blobRefToSrc(record.icon.ref, did) : undefined}
        publicationName={publication.name}
        description={record?.description}
        author={
          profile ? (
            <PublicationAuthor
              did={profile.did}
              displayName={profile.displayName}
              handle={profile.handle}
            />
          ) : undefined
        }
        subscribeButton={
          <div className="max-w-sm mx-auto">
            <SubscribeInput
              publicationUri={publication.uri}
              publicationUrl={record?.url}
              publicationName={record?.name ?? publication.name}
              publicationDescription={record?.description}
              newsletterMode={newsletterMode}
            />
          </div>
        }
      />
    </PublicationFullHeader>
  )
}
```

Key behavior change to flag: the with-nav branch drops `description`, `author`,
`subscribeButton` — per the design intent of "simplified header + nav that
shrinks on scroll". If that's wrong, the fix is to thread those props back in
on the with-nav side (still using `variant="inline"`).

Add the `PublicationFullHeader` import; keep the rest of the imports as-is.

## Step 4 — `PublicationPageRenderer.tsx`

Same branching shape as Step 3, but custom pages don't carry author or
subscribe button today:

```tsx
stickyHeader={
  navPages.length > 0 ? (
    <PublicationStickyHeader
      nav={
        <PublicationNav
          publicationUrl={getPublicationURL(publication)}
          pages={navPages}
          activePath={page.path}
        />
      }
    >
      <PublicationHeader
        variant="inline"
        iconUrl={normalizedPublication?.icon
          ? blobRefToSrc(normalizedPublication.icon.ref, did)
          : undefined}
        publicationName={publication.name}
      />
    </PublicationStickyHeader>
  ) : (
    <PublicationFullHeader>
      <PublicationHeader
        iconUrl={normalizedPublication?.icon
          ? blobRefToSrc(normalizedPublication.icon.ref, did)
          : undefined}
        publicationName={publication.name}
        description={normalizedPublication?.description}
      />
    </PublicationFullHeader>
  )
}
```

(A user landing on a custom-page URL when `navPages.length === 0` is an edge
case — direct link, no nav available — but it's still a valid render path, so
the no-nav branch needs to handle it.)

## Step 5 — `edit/[[...route]]/layout.tsx`

Move `PublicationPagesNav` from a sibling into the `nav` prop so it gets the
scroll-shrink wrapper. Keep `sticky={false}` (the page editor visually sticks
because of its flex layout — `position: sticky` is not used here).

Before (lines ~99–112):

```tsx
<div className="pubWrapper flex flex-col grow min-h-0 bg-bg-page rounded-t-lg overflow-hidden">
  <PublicationStickyHeader sticky={false}>
    <PublicationHeader variant="inline" iconUrl={iconUrl} … />
  </PublicationStickyHeader>
  <PublicationPagesNav did={params.did} publicationName={params.publication} />
  <div className="grow min-h-0 flex flex-col">{props.children}</div>
</div>
```

After:

```tsx
<div className="pubWrapper flex flex-col grow min-h-0 bg-bg-page rounded-t-lg overflow-hidden">
  <PublicationStickyHeader
    sticky={false}
    nav={<PublicationPagesNav did={params.did} publicationName={params.publication} />}
  >
    <PublicationHeader variant="inline" iconUrl={iconUrl} publicationName={publication.name} description={record?.description} />
  </PublicationStickyHeader>
  <div className="grow min-h-0 flex flex-col">{props.children}</div>
</div>
```

(Keep the existing `variant="inline"` and the description prop the editor
already passes.)

## Open question / risk

The scroll-shrink listener in `PublicationStickyHeader` attaches to
`el.parentElement` and filters scroll events by `.publicationScrollContainer`.
In the published view, that container is `PublicationHomeLayout`'s root — fine.

In the editor, `parentElement` is `pubWrapper` (no scroll container class), and
the real scroll container lives several levels deeper inside
`{props.children}` (each `Page` declares its own `publicationScrollContainer`).
Capture-phase scroll listeners on `pubWrapper` *should* fire as the event
passes down toward the inner Page, so the filter-by-class approach should still
catch it — but worth a manual smoke test in the editor after wiring, because
scroll events famously do not bubble. If shrink doesn't fire in the editor,
the fix is to walk up from `el` looking for the nearest scroll container
inside the DOM subtree, or to broaden the parent search.

## Verification checklist

- Published publication home, **0 nav pages**: full header (icon, title,
  description, author, subscribe), no animation, scrolls with the page,
  nothing stuck at the top.
- Published publication home, **≥1 nav pages**: compact icon + title + nav,
  sticks to top of scroll container, shrinks on scroll, nav stays visible.
- Published custom page (`/[rkey]`), **≥1 nav pages**: same as above with
  active path highlighting.
- Published custom page (`/[rkey]`), **0 nav pages**: full header renders
  above the page content, no animation.
- Page editor (`/edit/...`): compact icon + title + PublicationPagesNav,
  scroll-shrink behavior fires as you scroll the page body, header does not
  use `position: sticky`.
- `npx tsc` clean.
