---
name: update-default-theme
description: Update the app's default theme colors (accent, background, primary, highlights) consistently across every place a default is hardcoded. Use when changing the default accent/background/highlight colors so no surface (portaled modals, emails, presets, CSS fallbacks) drifts out of sync.
user-invocable: true
---

# Update Default Theme

The default theme (currently **green accent `#57822B` on off-white `#FDFCFA`**) is
hardcoded in several disconnected places. There is no single constant that all of
them import, so changing one leaves the others stale. The classic symptom: a
portaled surface (a Radix `Dialog` modal like `DiscussionModal`) escapes the
`local` `BaseThemeProvider` wrapper and falls back to the `:root` CSS defaults —
if those weren't updated, the modal shows the old colors while everything else
shows the new ones.

## When to use

The user wants to change what the default theme looks like — the default accent,
background, primary text, or highlighter colors — and wants it applied
everywhere. Also use it as a consistency audit after any theme-default edit.

## The canonical values

Treat these two files as the **source of truth**. Everything else must match them:

- `components/ThemeManager/themeDefaults.ts` — `PubThemeDefaults` (hex) and
  `PubThemeDefaultsRGB` (parsed RGB). Used by publication records and
  `createPublication.ts`.
- `components/ThemeManager/themeUtils.ts` — `ThemeDefaults` (labeled "the color
  defaults for everything"). Used by leaflet/`useColorAttribute` fallbacks.

Keep these two in agreement with each other first, then propagate outward.

Current default: accent-background/accent-contrast `#57822B` (rgb `87, 130, 43`),
accent-text `#FFFFFF`, background `#FDFCFA` (rgb `253, 252, 250`), primary
`#272727` (rgb `39, 39, 39`), highlight-2 `#EDD280` (rgb `237, 210, 128`),
highlight-3 `#FFCDC3` (rgb `255, 205, 195`). Highlight-1 has no fixed value — its
default is a *computed tint*: `color-mix(in oklab, rgb(var(--accent-contrast)),
rgb(var(--bg-page)) 75%)`.

## Every place to update (the checklist)

Work through all of these. Each stores the same defaults in a different format,
so convert accordingly (hex ↔ `r, g, b` triple ↔ `rgb(r, g, b)` string).

1. **`components/ThemeManager/themeDefaults.ts`** — `PubThemeDefaults` (hex) and
   `PubThemeDefaultsRGB` (`{ r, g, b }`). Keep both in sync with each other.
2. **`components/ThemeManager/themeUtils.ts`** — `ThemeDefaults` map
   (`theme/page-background`, `theme/card-background`, `theme/primary`,
   `theme/accent-background`, `theme/accent-text`, `theme/accent-contrast`,
   `theme/highlight-1..3`).
3. **`app/globals.css`** — the `@layer base { :root { ... } }` block. This is the
   fallback for anything rendered outside a `BaseThemeProvider` (portaled
   modals/overlays). Values are bare `r, g, b` triples: `--bg-leaflet`,
   `--bg-page`, `--primary`, `--accent-1`, `--accent-2`, `--accent-contrast`,
   `--highlight-2`, `--highlight-3`. `--highlight-1` is the `color-mix(...)`
   expression, **not** a triple — match `BaseThemeProvider`'s runtime fallback.
   Note `--bg-leaflet` = outer/page background (`#FDFCFA`), `--bg-page` = card
   (`#FFFFFF`).
4. **`emails/shared.tsx`** — `defaultEmailTheme` (`rgb(...)` strings) *and* the
   `@react-email` tailwind `colors` block lower in the same file. Gmail strips
   `color-mix()`, so `highlight-1` here must be a **literal** rgb resolved via the
   same math `mixRgb`/`defaultHighlightBackground` uses:
   `mixRgb(accent, pageBackground, 75)` — a simple sRGB lerp
   (`accent*0.25 + bg*0.75`). For `#57822B` on white that is `rgb(213, 224, 202)`.
5. **`components/ThemeManager/PubPickers/PubPresetPicker.tsx`** — the preset named
   `"Default"` (hex). Its `accent1`/`bgLeaflet`/`bgPage` must equal the canonical
   default (watch for near-miss values like `#57821E` vs `#57822B`).

Leave these alone — they are intentional, context-specific, not the global default:

- `StandalonePageBackground = "#FFFFFF"` in `PublicationThemeProvider.tsx`
  (standalone-doc page bg, mirrors the editor default).
- Other named presets in `PubPresetPicker.tsx` (Minimal, Bookish, Colorful, …).

## Process

1. Decide the new canonical values with the user (accent, background, primary,
   highlights). Express each as hex first.
2. Edit files 1 and 2 (the source of truth). Convert hex → RGB triples for the
   `RGB`/CSS variants.
3. Propagate to files 3–5, converting to each file's format.
4. Verify nothing stale remains — grep for the *old* values across `--include`
   `*.css`/`*.ts`/`*.tsx` (excluding `node_modules` and `.next`) to catch any
   leftover copies:
   ```bash
   grep -rn "OLD_HEX\|OLD_R, *OLD_G, *OLD_B\|rgb(OLD_R, OLD_G, OLD_B)" \
     --include="*.css" --include="*.ts" --include="*.tsx" . \
     | grep -vE "node_modules|\.next"
   ```
5. Sanity-check the CSS parses:
   ```bash
   node -e "const l=require('lightningcss'),fs=require('fs');l.transform({filename:'app/globals.css',code:fs.readFileSync('app/globals.css'),minify:false});console.log('css ok')"
   ```
6. Report the full list of files changed so the user can confirm coverage.

## Why this is fragile (context for the reader)

The runtime theme system reads the source-of-truth constants and writes CSS
variables onto the `BaseThemeProvider` wrapper (`local` mode) or `:root`
(non-local). Portals, emails, and presets each re-declare the defaults in their
own format because they render outside that runtime path. There is no shared
import binding them, so the only guard against drift is updating every entry in
the checklist together.
