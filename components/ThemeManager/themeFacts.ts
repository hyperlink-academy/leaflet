import { parseColor } from "@react-stately/color";
import type { PubLeafletPublication, PubLeafletThemeColor } from "lexicons/api";

import type { FactInput } from "src/utils/createLeaflet";
import { PubThemeDefaults } from "components/ThemeManager/themeDefaults";
import { blobRefToSrc } from "src/utils/blobRefToSrc";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://leaflet.pub";

// theme/* attributes themeFacts can write; retract these before reseeding so a
// reset clears stale draft-only facts (e.g. a background image the published
// theme doesn't have).
export const themeFactAttributes = [
  "theme/page-background",
  "theme/card-background",
  "theme/primary",
  "theme/accent-background",
  "theme/accent-text",
  "theme/card-border-hidden",
  "theme/page-width",
  "theme/heading-font",
  "theme/body-font",
  "theme/background-image",
  "theme/background-image-repeat",
] as const;

// Lexicon theme color (or hex default) → the hsba string theme/* facts store.
function toHsbaString(
  c: PubLeafletThemeColor.Rgb | PubLeafletThemeColor.Rgba | string | undefined,
  fallback: string,
): string {
  let color;
  if (!c) color = parseColor(fallback);
  else if (typeof c === "string") color = parseColor(c);
  else if (c.$type === "pub.leaflet.theme.color#rgba")
    color = parseColor(`rgba(${c.r}, ${c.g}, ${c.b}, ${(c.a ?? 100) / 100})`);
  else color = parseColor(`rgb(${c.r}, ${c.g}, ${c.b})`);
  let s = color.toString("hsba");
  return s.slice("hsba(".length, -1);
}

function isLexColor(
  c: unknown,
): c is PubLeafletThemeColor.Rgb | PubLeafletThemeColor.Rgba {
  let t = (c as { $type?: string } | null)?.$type;
  return (
    t === "pub.leaflet.theme.color#rgb" || t === "pub.leaflet.theme.color#rgba"
  );
}

// Seed theme/* facts from the published theme so a publish with no edits
// round-trips it.
export function themeFacts(
  theme: PubLeafletPublication.Theme | undefined,
  did: string,
): FactInput[] {
  const colors: [string, unknown, string][] = [
    ["theme/page-background", theme?.backgroundColor, PubThemeDefaults.backgroundColor],
    ["theme/card-background", theme?.pageBackground, PubThemeDefaults.pageBackground],
    ["theme/primary", theme?.primary, PubThemeDefaults.primary],
    ["theme/accent-background", theme?.accentBackground, PubThemeDefaults.accentBackground],
    ["theme/accent-text", theme?.accentText, PubThemeDefaults.accentText],
  ];
  const facts: FactInput[] = colors.map(([attribute, color, fallback]) => ({
    attribute,
    data: {
      type: "color",
      value: toHsbaString(isLexColor(color) ? color : undefined, fallback),
    },
  }));
  // Publications default to a borderless page (no page background).
  if (!theme?.showPageBackground)
    facts.push({
      attribute: "theme/card-border-hidden",
      data: { type: "boolean", value: true },
    });
  facts.push({
    attribute: "theme/page-width",
    data: { type: "number", value: theme?.pageWidth || 624 },
  });
  if (theme?.headingFont)
    facts.push({
      attribute: "theme/heading-font",
      data: { type: "string", value: theme.headingFont },
    });
  if (theme?.bodyFont)
    facts.push({
      attribute: "theme/body-font",
      data: { type: "string", value: theme.bodyFont },
    });
  if (theme?.backgroundImage?.image) {
    let src = blobRefToSrc(theme.backgroundImage.image.ref, did, APP_URL);
    facts.push({
      attribute: "theme/background-image",
      data: { type: "image", src, fallback: src, width: 0, height: 0 },
    });
    // Published `width` is the repeat tile size; its absence with repeat=true
    // mirrors the picker's default. repeat=false means cover (no fact).
    let repeatWidth = theme.backgroundImage.repeat
      ? theme.backgroundImage.width || 500
      : undefined;
    if (repeatWidth)
      facts.push({
        attribute: "theme/background-image-repeat",
        data: { type: "number", value: repeatWidth },
      });
  }
  return facts;
}
