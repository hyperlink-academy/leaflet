"use server";
import { TID } from "@atproto/common";
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
  buildRecord: RecordBuilder,
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
  const publicationType = getPublicationType(aturi.collection) as PublicationType;

  // Normalize existing record
  const normalizedPub = normalizePublicationRecord(existingPub.record);
  const existingBasePath = normalizedPub?.url
    ? normalizedPub.url.replace(/^https?:\/\//, "")
    : undefined;

  // Build the updated record
  const record = await buildRecord({
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

/**
 * Helper to build preferences object with correct $type based on publication type.
 * site.standard.publication preferences is a simple object type, no $type needed.
 * pub.leaflet.publication preferences requires $type.
 */
function buildPreferences(
  preferencesData: NormalizedPublication["preferences"] | undefined,
  publicationType: PublicationType,
): SiteStandardPublication.Preferences | PubLeafletPublication.Preferences | undefined {
  if (!preferencesData) return undefined;

  const basePreferences = {
    showInDiscover: preferencesData.showInDiscover,
    showComments: preferencesData.showComments,
    showMentions: preferencesData.showMentions,
    showPrevNext: preferencesData.showPrevNext,
  };

  if (publicationType === "site.standard.publication") {
    return basePreferences;
  }

  return {
    $type: "pub.leaflet.publication#preferences" as const,
    ...basePreferences,
  };
}

/**
 * Helper to build the base record fields (shared between all update functions)
 */
function buildBaseRecord(
  normalizedPub: NormalizedPublication | null,
  existingBasePath: string | undefined,
  publicationType: PublicationType,
  overrides: {
    name?: string;
    description?: string;
    icon?: any;
    theme?: any;
    basicTheme?: NormalizedPublication["basicTheme"];
    preferences?: NormalizedPublication["preferences"];
    basePath?: string;
  },
): PubLeafletPublication.Record | SiteStandardPublication.Record {
  const name = overrides.name ?? normalizedPub?.name ?? "";
  const description = overrides.description !== undefined
    ? overrides.description
    : normalizedPub?.description;
  const icon = overrides.icon !== undefined ? overrides.icon : normalizedPub?.icon;
  const theme = overrides.theme !== undefined ? overrides.theme : normalizedPub?.theme;
  const basicTheme = overrides.basicTheme !== undefined ? overrides.basicTheme : normalizedPub?.basicTheme;
  const preferencesData = overrides.preferences ?? normalizedPub?.preferences;
  const basePath = overrides.basePath ?? existingBasePath;

  if (publicationType === "site.standard.publication") {
    return {
      $type: publicationType,
      name,
      description,
      icon,
      theme,
      basicTheme,
      preferences: buildPreferences(preferencesData, publicationType),
      url: basePath ? `https://${basePath}` : normalizedPub?.url || "",
    } as SiteStandardPublication.Record;
  }

  return {
    $type: publicationType,
    name,
    description,
    icon,
    theme,
    preferences: buildPreferences(preferencesData, publicationType),
    base_path: basePath,
  } as PubLeafletPublication.Record;
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
  return withPublicationUpdate(uri, async ({ normalizedPub, existingBasePath, publicationType, agent }) => {
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

    return buildBaseRecord(normalizedPub, existingBasePath, publicationType, {
      name,
      description,
      icon: iconBlob,
      preferences,
    });
  });
}

export async function updatePublicationBasePath({
  uri,
  base_path,
}: {
  uri: string;
  base_path: string;
}): Promise<UpdatePublicationResult> {
  return withPublicationUpdate(uri, async ({ normalizedPub, existingBasePath, publicationType }) => {
    return buildBaseRecord(normalizedPub, existingBasePath, publicationType, {
      basePath: base_path,
    });
  });
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
  return withPublicationUpdate(uri, async ({ normalizedPub, existingBasePath, publicationType, agent }) => {
    // Build theme object
    const themeData = {
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

    return buildBaseRecord(normalizedPub, existingBasePath, publicationType, {
      theme: themeData,
    });
  });
}
