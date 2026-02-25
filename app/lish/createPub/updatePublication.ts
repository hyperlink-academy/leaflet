"use server";
import {
  AtpBaseClient,
  PubLeafletPublication,
  PubLeafletThemeColor,
  SiteStandardPublication,
} from "lexicons/api";
import { restoreOAuthSession, OAuthSessionError } from "src/atproto-oauth";
import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";
import { AtUri } from "@atproto/syntax";
import { $Typed } from "@atproto/api";
import {
  normalizePublicationRecord,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";
import { getPublicationType } from "src/utils/collectionHelpers";

type UpdatePublicationResult =
  | { success: true; publication: any }
  | { success: false; error?: OAuthSessionError };

type PublicationType = "pub.leaflet.publication" | "site.standard.publication";

type RecordBuilder = (args: {
  normalizedPub: NormalizedPublication | null;
  existingBasePath: string | undefined;
  publicationType: PublicationType;
  agent: AtpBaseClient;
}) => Promise<PubLeafletPublication.Record | SiteStandardPublication.Record>;

/**
 * Shared helper for publication updates. Handles:
 * - Authentication and session restoration
 * - Fetching existing publication from database
 * - Normalizing the existing record
 * - Calling the record builder to create the updated record
 * - Writing to PDS via putRecord
 * - Writing to database
 */
async function withPublicationUpdate(
  uri: string,
  recordBuilder: RecordBuilder,
): Promise<UpdatePublicationResult> {
  // Get identity and validate authentication
  const identity = await getIdentityData();
  if (!identity || !identity.atp_did) {
    return {
      success: false,
      error: {
        type: "oauth_session_expired",
        message: "Not authenticated",
        did: "",
      },
    };
  }

  // Restore OAuth session
  const sessionResult = await restoreOAuthSession(identity.atp_did);
  if (!sessionResult.ok) {
    return { success: false, error: sessionResult.error };
  }
  const credentialSession = sessionResult.value;
  const agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );

  // Fetch existing publication from database
  const { data: existingPub } = await supabaseServerClient
    .from("publications")
    .select("*")
    .eq("uri", uri)
    .single();
  if (!existingPub || existingPub.identity_did !== identity.atp_did) {
    return { success: false };
  }

  const aturi = new AtUri(existingPub.uri);
  const publicationType = getPublicationType(
    aturi.collection,
  ) as PublicationType;

  // Normalize existing record
  const normalizedPub = normalizePublicationRecord(existingPub.record);
  const existingBasePath = normalizedPub?.url
    ? normalizedPub.url.replace(/^https?:\/\//, "")
    : undefined;

  // Build the updated record
  const record = await recordBuilder({
    normalizedPub,
    existingBasePath,
    publicationType,
    agent,
  });

  // Write to PDS
  await agent.com.atproto.repo.putRecord({
    repo: credentialSession.did!,
    rkey: aturi.rkey,
    record,
    collection: publicationType,
    validate: false,
  });

  // Optimistically write to database
  const { data: publication } = await supabaseServerClient
    .from("publications")
    .update({
      name: record.name,
      record: record as Json,
    })
    .eq("uri", uri)
    .select()
    .single();

  return { success: true, publication };
}

/** Fields that can be overridden when building a record */
interface RecordOverrides {
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
        }
      : undefined,
  };
}

/**
 * Builds a record for the appropriate publication type.
 */
function buildRecord(
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

export async function updatePublication({
  uri,
  name,
  description,
  iconFile,
  preferences,
}: {
  uri: string;
  name: string;
  description?: string;
  iconFile?: File | null;
  preferences?: Omit<PubLeafletPublication.Preferences, "$type">;
}): Promise<UpdatePublicationResult> {
  return withPublicationUpdate(
    uri,
    async ({ normalizedPub, existingBasePath, publicationType, agent }) => {
      // Upload icon if provided
      let iconBlob = normalizedPub?.icon;
      if (iconFile && iconFile.size > 0) {
        const buffer = await iconFile.arrayBuffer();
        const uploadResult = await agent.com.atproto.repo.uploadBlob(
          new Uint8Array(buffer),
          { encoding: iconFile.type },
        );
        if (uploadResult.data.blob) {
          iconBlob = uploadResult.data.blob;
        }
      }

      return buildRecord(normalizedPub, existingBasePath, publicationType, {
        name,
        ...(description !== undefined && { description }),
        icon: iconBlob,
        preferences,
      });
    },
  );
}

export async function updatePublicationBasePath({
  uri,
  base_path,
}: {
  uri: string;
  base_path: string;
}): Promise<UpdatePublicationResult> {
  return withPublicationUpdate(
    uri,
    async ({ normalizedPub, existingBasePath, publicationType }) => {
      return buildRecord(normalizedPub, existingBasePath, publicationType, {
        basePath: base_path,
      });
    },
  );
}

type Color =
  | $Typed<PubLeafletThemeColor.Rgb, "pub.leaflet.theme.color#rgb">
  | $Typed<PubLeafletThemeColor.Rgba, "pub.leaflet.theme.color#rgba">;

export async function updatePublicationTheme({
  uri,
  theme,
}: {
  uri: string;
  theme: {
    backgroundImage?: File | null;
    backgroundRepeat?: number | null;
    backgroundColor: Color;
    pageWidth?: number;
    primary: Color;
    pageBackground: Color;
    showPageBackground: boolean;
    accentBackground: Color;
    accentText: Color;
  };
}): Promise<UpdatePublicationResult> {
  return withPublicationUpdate(
    uri,
    async ({ normalizedPub, existingBasePath, publicationType, agent }) => {
      // Build theme object
      const themeData = {
        $type: "pub.leaflet.publication#theme" as const,
        backgroundImage: theme.backgroundImage
          ? {
              $type: "pub.leaflet.theme.backgroundImage",
              image: (
                await agent.com.atproto.repo.uploadBlob(
                  new Uint8Array(await theme.backgroundImage.arrayBuffer()),
                  { encoding: theme.backgroundImage.type },
                )
              )?.data.blob,
              width: theme.backgroundRepeat || undefined,
              repeat: !!theme.backgroundRepeat,
            }
          : theme.backgroundImage === null
            ? undefined
            : normalizedPub?.theme?.backgroundImage,
        backgroundColor: theme.backgroundColor
          ? {
              ...theme.backgroundColor,
            }
          : undefined,
        pageWidth: theme.pageWidth,
        primary: {
          ...theme.primary,
        },
        pageBackground: {
          ...theme.pageBackground,
        },
        showPageBackground: theme.showPageBackground,
        accentBackground: {
          ...theme.accentBackground,
        },
        accentText: {
          ...theme.accentText,
        },
      };

      // Derive basicTheme from the theme colors for site.standard.publication
      const basicTheme: NormalizedPublication["basicTheme"] = {
        $type: "site.standard.theme.basic",
        background: {
          $type: "site.standard.theme.color#rgb",
          r: theme.backgroundColor.r,
          g: theme.backgroundColor.g,
          b: theme.backgroundColor.b,
        },
        foreground: {
          $type: "site.standard.theme.color#rgb",
          r: theme.primary.r,
          g: theme.primary.g,
          b: theme.primary.b,
        },
        accent: {
          $type: "site.standard.theme.color#rgb",
          r: theme.accentBackground.r,
          g: theme.accentBackground.g,
          b: theme.accentBackground.b,
        },
        accentForeground: {
          $type: "site.standard.theme.color#rgb",
          r: theme.accentText.r,
          g: theme.accentText.g,
          b: theme.accentText.b,
        },
      };

      return buildRecord(normalizedPub, existingBasePath, publicationType, {
        theme: themeData,
        basicTheme,
      });
    },
  );
}
