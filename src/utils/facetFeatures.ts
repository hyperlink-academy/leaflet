import { PubLeafletRichtextFacet } from "lexicons/api";
import type { LiteralTyped } from "./blockDispatch";

// Facet features are combinable marks (a segment can be bold + italic + a
// link at once), so unlike blocks they don't dispatch one-of — but the same
// silent-drift hazard applies: every renderer used to run its own hand-picked
// set of `.find(isX)` calls, and a new feature type quietly rendered as plain
// text everywhere that forgot it. `extractFacetFeatures` is the one shared
// lookup; its keys derive from the generated feature union, so a new feature
// type is a compile error below until extracted, and each renderer then
// decides what to do with the new field.

type Feature = PubLeafletRichtextFacet.Main["features"][number];
type KnownFeature = LiteralTyped<Feature>;

// Key by the $type's hash name ("link", "bold", …) for ergonomic access.
// Assumes hash names are unique across the union — true while every feature
// lives in pub.leaflet.richtext.facet; a cross-lexicon feature with a
// colliding hash would need this keying revisited.
type HashName<T extends string> = T extends `${string}#${infer K}` ? K : never;

export type FacetFeatureTypes = {
  [F in KnownFeature as HashName<F["$type"]>]: F;
};

export type FacetFeatures = Partial<FacetFeatureTypes>;

// First match per kind — identical to the per-kind `.find(isX)` calls this
// replaces. The all-keys-required mapped type forces a lookup for every known
// kind.
export function extractFacetFeatures(
  features: Feature[] | undefined,
): FacetFeatures {
  const fs = features ?? [];
  const found: {
    [K in keyof FacetFeatureTypes]: FacetFeatureTypes[K] | undefined;
  } = {
    link: fs.find(PubLeafletRichtextFacet.isLink),
    didMention: fs.find(PubLeafletRichtextFacet.isDidMention),
    atMention: fs.find(PubLeafletRichtextFacet.isAtMention),
    code: fs.find(PubLeafletRichtextFacet.isCode),
    highlight: fs.find(PubLeafletRichtextFacet.isHighlight),
    underline: fs.find(PubLeafletRichtextFacet.isUnderline),
    strikethrough: fs.find(PubLeafletRichtextFacet.isStrikethrough),
    id: fs.find(PubLeafletRichtextFacet.isId),
    bold: fs.find(PubLeafletRichtextFacet.isBold),
    italic: fs.find(PubLeafletRichtextFacet.isItalic),
    footnote: fs.find(PubLeafletRichtextFacet.isFootnote),
  };
  return found;
}
