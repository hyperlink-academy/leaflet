import { sql } from "drizzle-orm";
import { parseColor } from "@react-stately/color";
import type { PubLeafletPublication, PubLeafletThemeColor } from "lexicons/api";

import {
  createLeaflet,
  type DefaultBlockSpec,
  type FactInput,
} from "src/utils/createLeaflet";
import { PubThemeDefaults } from "components/ThemeManager/themeDefaults";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { supabaseServerClient } from "supabase/serverClient";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://leaflet.pub";

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
function themeFacts(
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

// Create and seed a publication's draft leaflet: a home page at route "/"
// plus theme/* facts mirroring the published theme. Never clobbers an
// existing draft_leaflet — if a concurrent request won, its token is returned.
export async function createPublicationDraftLeaflet(args: {
  publication_uri: string;
  did: string;
  description?: string;
  theme?: PubLeafletPublication.Theme;
}): Promise<string> {
  const firstBlocks: DefaultBlockSpec[] = [
    ...(args.description
      ? [{ type: "text" as const, content: args.description }]
      : []),
    "posts-list",
    "signup",
  ];

  const { permTokenId } = await createLeaflet({
    pageType: "doc",
    firstBlocks,
    rootFacts: themeFacts(args.theme, args.did),
    pageFacts: [
      { attribute: "page/type", data: { type: "page-type-union", value: "doc" } },
      { attribute: "page/route", data: { type: "string", value: "/" } },
      { attribute: "page/title", data: { type: "string", value: "Home" } },
    ],
    tailCte: ({ permTokenId }) => sql`, attach AS (
      UPDATE publications SET draft_leaflet = ${permTokenId}
      WHERE uri = ${args.publication_uri} AND draft_leaflet IS NULL
    )`,
  });

  const { data } = await supabaseServerClient
    .from("publications")
    .select("draft_leaflet")
    .eq("uri", args.publication_uri)
    .single();
  return data?.draft_leaflet ?? permTokenId;
}
