import type {
  PubLeafletPublication,
  SiteStandardPublication,
} from "lexicons/api";
import type { NormalizedPublication } from "src/utils/normalizeRecords";

export type PublicationType =
  | "pub.leaflet.publication"
  | "site.standard.publication";

/** Fields that can be overridden when building a record */
export interface RecordOverrides {
  name?: string;
  description?: string;
  icon?: any;
  theme?: any;
  basicTheme?: NormalizedPublication["basicTheme"];
  preferences?: NormalizedPublication["preferences"];
  basePath?: string;
}

/** Merges override with existing value, respecting explicit undefined */
function resolveField<T>(
  override: T | undefined,
  existing: T | undefined,
  hasOverride: boolean,
): T | undefined {
  return hasOverride ? override : existing;
}

/**
 * Builds a pub.leaflet.publication record.
 * Uses base_path for the URL path component.
 */
function buildLeafletRecord(
  normalizedPub: NormalizedPublication | null,
  existingBasePath: string | undefined,
  overrides: RecordOverrides,
): PubLeafletPublication.Record {
  const preferences = overrides.preferences ?? normalizedPub?.preferences;

  return {
    $type: "pub.leaflet.publication",
    name: overrides.name ?? normalizedPub?.name ?? "",
    description: resolveField(
      overrides.description,
      normalizedPub?.description,
      "description" in overrides,
    ),
    icon: resolveField(
      overrides.icon,
      normalizedPub?.icon,
      "icon" in overrides,
    ),
    theme: resolveField(
      overrides.theme,
      normalizedPub?.theme,
      "theme" in overrides,
    ),
    base_path: overrides.basePath ?? existingBasePath,
    preferences: preferences
      ? {
          $type: "pub.leaflet.publication#preferences",
          showInDiscover: preferences.showInDiscover,
          showComments: preferences.showComments,
          showMentions: preferences.showMentions,
          showPrevNext: preferences.showPrevNext,
          showRecommends: preferences.showRecommends,
          showFirstLast: preferences.showFirstLast,
        }
      : undefined,
  };
}

/**
 * Builds a site.standard.publication record.
 * Uses url for the full URL. Also supports basicTheme.
 */
function buildStandardRecord(
  normalizedPub: NormalizedPublication | null,
  existingBasePath: string | undefined,
  overrides: RecordOverrides,
): SiteStandardPublication.Record {
  const preferences = overrides.preferences ?? normalizedPub?.preferences;
  const basePath = overrides.basePath ?? existingBasePath;

  return {
    $type: "site.standard.publication",
    name: overrides.name ?? normalizedPub?.name ?? "",
    description: resolveField(
      overrides.description,
      normalizedPub?.description,
      "description" in overrides,
    ),
    icon: resolveField(
      overrides.icon,
      normalizedPub?.icon,
      "icon" in overrides,
    ),
    theme: resolveField(
      overrides.theme,
      normalizedPub?.theme,
      "theme" in overrides,
    ),
    basicTheme: resolveField(
      overrides.basicTheme,
      normalizedPub?.basicTheme,
      "basicTheme" in overrides,
    ),
    url: basePath ? `https://${basePath}` : normalizedPub?.url || "",
    preferences: preferences
      ? {
          showInDiscover: preferences.showInDiscover,
          showComments: preferences.showComments,
          showMentions: preferences.showMentions,
          showPrevNext: preferences.showPrevNext,
          showRecommends: preferences.showRecommends,
          showFirstLast: preferences.showFirstLast,
        }
      : undefined,
  };
}

/**
 * Builds a record for the appropriate publication type.
 */
export function buildRecord(
  normalizedPub: NormalizedPublication | null,
  existingBasePath: string | undefined,
  publicationType: PublicationType,
  overrides: RecordOverrides,
): PubLeafletPublication.Record | SiteStandardPublication.Record {
  if (publicationType === "pub.leaflet.publication") {
    return buildLeafletRecord(normalizedPub, existingBasePath, overrides);
  }
  return buildStandardRecord(normalizedPub, existingBasePath, overrides);
}
