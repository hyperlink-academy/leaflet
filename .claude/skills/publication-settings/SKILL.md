---
name: publication-settings
description: Wire a setting in the General tab of publication settings end to end, so the change marks the form dirty, survives the Save button, and actually applies. Use whenever you add a new setting or change an existing one under dashboard/settings — the value passes through several hand-maintained field lists and silently drops out of any one you forget.
user-invocable: true
---

# Publication General Settings

A setting in the General tab is not done when the control renders. The value has to
survive a round trip:

```
local state in SettingsContent
  → hasUnsavedChanges (gates the footer)
  → form submit → updatePublication()
  → buildRecord() → putRecord to the PDS + publications.record in supabase
  → normalizePublication() on read
  → back into SettingsContent's initial state, and into the published page
```

Every arrow except the first is a **hand-maintained explicit field list**. None of them
spread. A field missing from any one is dropped with no type error and no runtime
error — the toggle just doesn't stick, or sticks but does nothing.

## When to use

Adding a setting to, or changing a setting in, the General tab
(`app/(app)/(identity)/lish/[did]/[publication]/dashboard/settings/`) — `GeneralSettings`,
`ShareSettings`, `ThemeAndLayoutSettings`, `RecommendedPubsSetting`, or a new section.

Not for the Monetization / Contributors / Newsletter tabs — those render their own
panes and don't go through the shared form or the footer's save button.

## Two kinds of setting

**A. Backed by the publication record** (every `preferences.*` flag, name, description,
icon). Saved by `updatePublication`, written into the pub's AT Proto record.

**B. Backed by its own record or table** (recommendations). Loads on its own SWR key,
saves through its own write inside the same submit.

Most new settings are A. If the setting needs its own lexicon record, it's B — read
`RecommendedPubsSetting.tsx` and `writeRecommendations` in `updatePublication.ts` as the
worked example, then follow section B's extra steps on top of the SettingsContent wiring.

## A. Checklist for a record-backed preference

Work top to bottom. Each step names what breaks if you skip it.

### 1. Lexicon — both of them

- `lexicons/src/publication.ts` → the `preferences` object. Give it a `default`.
- `lexicons/site/standard/publication.json` → the mirrored `preferences` object.
  **This file is hand-maintained**, not generated: `lexicons/build.ts` only writes
  `lexicons/pub/leaflet/`. `site.standard` is a shared external standard, so editing
  it is a deliberate act — but the two record shapes are converted into each other by
  `normalizePublication`, so a field present in only one is lost for pubs of the other type.
- Run `npm run lexgen`. This regenerates `lexicons/pub/leaflet/*.json` and the types in
  `lexicons/api/`. Skipping it means `PubLeafletPublication.Preferences` — the type on
  `updatePublication`'s `preferences` param — won't have your field, and the call site
  won't compile.

### 2. `lexicons/src/normalize.ts` → `normalizePublication`

The `preferences` object is rebuilt field by field when converting a
`pub.leaflet.publication` record into the normalized shape. **This is the most common
miss.** A field absent here writes to the PDS fine and then vanishes on read: the
setting appears to save (toast fires) and then snaps back to the default on reload, and
the unsaved-changes footer may stay stuck open because the read-back never matches local
state.

### 3. `src/utils/buildPublicationRecord.ts`

Add the field in **both** `buildLeafletRecord` and `buildStandardRecord`. Missing from
one, and the setting works for one publication type and silently no-ops for the other.

Note how preferences merge: `overrides.preferences ?? normalizedPub?.preferences`. The
override replaces the stored object **wholesale** — it is not a per-field merge. So the
submit handler must always send a complete preferences object; omitting one field from
the payload erases its saved value rather than leaving it alone.

### 4. `SettingsContent.tsx` — four separate places

1. **`useState` initializer**, using the same default as the lexicon:
   `record?.preferences?.showX === undefined ? true : record.preferences.showX`.
   The explicit `undefined` check is deliberate — `??`/`||` on a boolean would flip a
   saved `false` back to the default.
2. **`hasUnsavedChanges`**: compare against the saved value *and* add the state to the
   `useMemo` dependency array. Miss either and the footer never appears, so the user
   can't save at all.
3. **The submit payload's `preferences` object** (see the wholesale-replace note above).
4. **Pass state + setter down** to the section component.

If the setting carries transient state that isn't part of the record (a `File`, a
"removed" flag), reset it in the success branch of the submit handler the way
`setIconFile(null)` / `setIconRemoved(false)` do.

Leave the sync-from-server `useEffect` alone unless you have a reason. It deliberately
re-syncs only name/description/icon; a background SWR revalidation that re-synced
preference state would clobber edits in progress. (That's exactly why icon removal is
tracked by a separate `iconRemoved` flag instead of by clearing the preview.)

### 5. The section component

`GeneralSettings` / `ShareSettings` / `ThemeAndLayoutSettings` are controlled and
stateless — value in, setter in, no local state, no saving of their own. Use
`ToggleSetting` / `InputSetting` from `components/SettingsLayout`. Keep it that way:
state lives in `SettingsContent` because that's what the footer and the submit read.

### 6. New publications — `app/(app)/(identity)/lish/createPub/createPublication.ts`

Its `preferences` object is *also* an explicit list. Skip it and existing pubs get the
setting while newly created ones silently don't.

### 7. Actually apply it

The point of the setting. Find the consumer and wire it:

- **Per-post overridable?** Add it to `src/utils/mergePreferences.ts` — document prefs
  win over publication prefs there. Publication-only settings (like `showPrevNext`)
  read straight from the publication side.
- **Published page**: thread it through the `preferences` prop types in
  `PostPages.tsx` / `LinearDocumentPage.tsx` / `CanvasPage.tsx` down to the component.
- **Server-side filtering** (a `showInDiscover`-shaped flag): the feed queries in
  `feeds/index.ts`, `actions/reader/getNewFeed.ts`, `actions/reader/getHotFeed.ts`, and
  `app/api/rpc/[command]/get_profile_data.ts` each filter on the raw JSON path and each
  treat "absent" as the default. Add the same null-tolerant condition to all of them.
- **Settings previews**: `ThemeAndLayoutSettings`'s inline preview and
  `theme-settings/PostPreview.tsx` read preferences too.

## B. Extra steps for a setting with its own record

On top of the SettingsContent wiring above:

- Load it on its own SWR key with `revalidateOnFocus: false`, and hold local state as
  `T | null` where `null` means "not loaded yet". Sync `null → loaded` in a `useEffect`.
- **Guard the submit**: only include the field when it isn't `null`
  (`...(recommendations !== null && { recommendations })`). Without this, hitting save
  before the load finishes wipes the stored value.
- `hasUnsavedChanges` compares local state against the *separately loaded* saved value,
  not against the publication record.
- On success, `mutate` that SWR key with the new value and `{ revalidate: false }` —
  the publication record's `mutate()` won't refresh it.
- Server side: write the record and mirror it into supabase the way the appview would
  index it from the firehose, so the row shape matches what the firehose consumer
  produces. Empty list = delete the record.

## Verify before calling it done

Run `npx tsc`. Then, in the app, for the setting you touched:

1. Change the control → the "You have unsaved updates!" footer appears.
2. Hit Update Pub → success toast, footer disappears (it disappears because the
   read-back now matches local state — if it lingers, step 2 or 3 above is wrong).
3. Reload the settings page → the control still shows the new value.
4. Load a published post / the relevant surface → the behavior actually changed.
5. Change it back and repeat, especially for booleans — the `=== undefined` default
   handling is where a saved `false` gets lost.

Step 3 catches the normalize/buildRecord misses; step 4 catches "saved but never read."

## Failure symptom → cause

| Symptom | Look at |
|---|---|
| Footer never appears when the control changes | `hasUnsavedChanges` — the comparison or its dep array |
| Saves, but reverts on reload | `normalizePublication`, then `buildPublicationRecord` |
| Footer stays open after a successful save | same — read-back doesn't match local state |
| Works for one pub, not another | only one of `buildLeafletRecord` / `buildStandardRecord`, or only one lexicon |
| Saves and persists, but nothing changes on the page | consumer not wired / `mergePreferences` |
| Another setting got reset when this one saved | submit payload isn't sending a complete `preferences` object |
| New pubs don't have it | `createPublication.ts` |
| Wiped when saved quickly after page load | type-B null guard in the submit payload |
