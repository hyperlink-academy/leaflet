/**
 * Normalization utilities for converting between pub.leaflet and site.standard lexicon formats.
 *
 * The standard format (site.standard.*) is used as the canonical representation for
 * reading data from the database, while both formats are accepted for storage.
 */

import type * as PubLeafletDocument from "../api/types/pub/leaflet/document";
import type * as PubLeafletPublication from "../api/types/pub/leaflet/publication";
import type * as PubLeafletContent from "../api/types/pub/leaflet/content";
import type * as SiteStandardDocument from "../api/types/site/standard/document";
import type * as SiteStandardPublication from "../api/types/site/standard/publication";
import type * as SiteStandardThemeBasic from "../api/types/site/standard/theme/basic";
import type * as PubLeafletThemeColor from "../api/types/pub/leaflet/theme/color";
import type { $Typed } from "../api/util";

// Normalized document type - uses the generated site.standard.document type
// with an additional optional theme field for backwards compatibility
export type NormalizedDocument = SiteStandardDocument.Record & {
  // Keep the original theme for components that need leaflet-specific styling
  theme?: PubLeafletPublication.Theme;
};

// Normalized publication type - uses the generated site.standard.publication type
export type NormalizedPublication = SiteStandardPublication.Record;

/**
 * Checks if the record is a pub.leaflet.document
 */
export function isLeafletDocument(
  record: unknown
): record is PubLeafletDocument.Record {
  if (!record || typeof record !== "object") return false;
  const r = record as Record<string, unknown>;
  return (
    r.$type === "pub.leaflet.document" ||
    // Legacy records without $type but with pages array
    (Array.isArray(r.pages) && typeof r.author === "string")
  );
}

/**
 * Checks if the record is a site.standard.document
 */
export function isStandardDocument(
  record: unknown
): record is SiteStandardDocument.Record {
  if (!record || typeof record !== "object") return false;
  const r = record as Record<string, unknown>;
  return r.$type === "site.standard.document";
}

/**
 * Checks if the record is a pub.leaflet.publication
 */
export function isLeafletPublication(
  record: unknown
): record is PubLeafletPublication.Record {
  if (!record || typeof record !== "object") return false;
  const r = record as Record<string, unknown>;
  return (
    r.$type === "pub.leaflet.publication" ||
    // Legacy records without $type but with name and no url
    (typeof r.name === "string" && !("url" in r))
  );
}

/**
 * Checks if the record is a site.standard.publication
 */
export function isStandardPublication(
  record: unknown
): record is SiteStandardPublication.Record {
  if (!record || typeof record !== "object") return false;
  const r = record as Record<string, unknown>;
  return r.$type === "site.standard.publication";
}

/**
 * Extracts RGB values from a color union type
 */
function extractRgb(
  color:
    | $Typed<PubLeafletThemeColor.Rgba>
    | $Typed<PubLeafletThemeColor.Rgb>
    | { $type: string }
    | undefined
): { r: number; g: number; b: number } | undefined {
  if (!color || typeof color !== "object") return undefined;
  const c = color as Record<string, unknown>;
  if (
    typeof c.r === "number" &&
    typeof c.g === "number" &&
    typeof c.b === "number"
  ) {
    return { r: c.r, g: c.g, b: c.b };
  }
  return undefined;
}

/**
 * Converts a pub.leaflet theme to a site.standard.theme.basic format
 */
export function leafletThemeToBasicTheme(
  theme: PubLeafletPublication.Theme | undefined
): SiteStandardThemeBasic.Main | undefined {
  if (!theme) return undefined;

  const background = extractRgb(theme.backgroundColor);
  const accent = extractRgb(theme.accentBackground) || extractRgb(theme.primary);
  const accentForeground = extractRgb(theme.accentText);

  // If we don't have the required colors, return undefined
  if (!background || !accent) return undefined;

  // Default foreground to dark if not specified
  const foreground = { r: 0, g: 0, b: 0 };

  // Default accent foreground to white if not specified
  const finalAccentForeground = accentForeground || { r: 255, g: 255, b: 255 };

  return {
    $type: "site.standard.theme.basic",
    background: { $type: "site.standard.theme.color#rgb", ...background },
    foreground: { $type: "site.standard.theme.color#rgb", ...foreground },
    accent: { $type: "site.standard.theme.color#rgb", ...accent },
    accentForeground: {
      $type: "site.standard.theme.color#rgb",
      ...finalAccentForeground,
    },
  };
}

/**
 * Normalizes a document record from either format to the standard format.
 *
 * @param record - The document record from the database (either pub.leaflet or site.standard)
 * @returns A normalized document in site.standard format, or null if invalid/unrecognized
 */
export function normalizeDocument(record: unknown): NormalizedDocument | null {
  if (!record || typeof record !== "object") return null;

  // Pass through site.standard records directly
  if (isStandardDocument(record)) {
    return record as NormalizedDocument;
  }

  if (isLeafletDocument(record)) {
    // Convert from pub.leaflet to site.standard
    const site = record.publication;
    const publishedAt = record.publishedAt;

    if (!site || !publishedAt) {
      return null;
    }

    // Wrap pages in pub.leaflet.content structure
    const content: $Typed<PubLeafletContent.Main> | undefined = record.pages
      ? {
          $type: "pub.leaflet.content" as const,
          pages: record.pages,
        }
      : undefined;

    return {
      $type: "site.standard.document",
      title: record.title,
      site,
      publishedAt,
      description: record.description,
      tags: record.tags,
      coverImage: record.coverImage,
      bskyPostRef: record.postRef,
      content,
      theme: record.theme,
    };
  }

  return null;
}

/**
 * Normalizes a publication record from either format to the standard format.
 *
 * @param record - The publication record from the database (either pub.leaflet or site.standard)
 * @returns A normalized publication in site.standard format, or null if invalid/unrecognized
 */
export function normalizePublication(
  record: unknown
): NormalizedPublication | null {
  if (!record || typeof record !== "object") return null;

  // Pass through site.standard records directly
  if (isStandardPublication(record)) {
    return record;
  }

  if (isLeafletPublication(record)) {
    // Convert from pub.leaflet to site.standard
    const url = record.base_path ? `https://${record.base_path}` : undefined;

    if (!url) {
      return null;
    }

    const basicTheme = leafletThemeToBasicTheme(record.theme);

    // Convert preferences to site.standard format (strip/replace $type)
    const preferences: SiteStandardPublication.Preferences | undefined =
      record.preferences
        ? {
            showInDiscover: record.preferences.showInDiscover,
            showComments: record.preferences.showComments,
            showMentions: record.preferences.showMentions,
            showPrevNext: record.preferences.showPrevNext,
          }
        : undefined;

    return {
      $type: "site.standard.publication",
      name: record.name,
      url,
      description: record.description,
      icon: record.icon,
      basicTheme,
      theme: record.theme,
      preferences,
    };
  }

  return null;
}

/**
 * Type guard to check if a normalized document has leaflet content
 */
export function hasLeafletContent(
  doc: NormalizedDocument
): doc is NormalizedDocument & {
  content: $Typed<PubLeafletContent.Main>;
} {
  return (
    doc.content !== undefined &&
    (doc.content as { $type?: string }).$type === "pub.leaflet.content"
  );
}

/**
 * Gets the pages array from a normalized document, handling both formats
 */
export function getDocumentPages(
  doc: NormalizedDocument
): PubLeafletContent.Main["pages"] | undefined {
  if (!doc.content) return undefined;

  if (hasLeafletContent(doc)) {
    return doc.content.pages;
  }

  // Unknown content type
  return undefined;
}
