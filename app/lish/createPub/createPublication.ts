"use server";
import { TID } from "@atproto/common";
import {
  AtpBaseClient,
  PubLeafletPublication,
  SiteStandardPublication,
} from "lexicons/api";
import {
  restoreOAuthSession,
  OAuthSessionError,
} from "src/atproto-oauth";
import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";
import { Vercel } from "@vercel/sdk";
import { isProductionDomain } from "src/utils/isProductionDeployment";
import { string } from "zod";
import { getPublicationType } from "src/utils/collectionHelpers";
import { PubThemeDefaultsRGB } from "components/ThemeManager/themeDefaults";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const vercel = new Vercel({
  bearerToken: VERCEL_TOKEN,
});
let subdomainValidator = string()
  .min(3)
  .max(63)
  .regex(/^[a-z0-9-]+$/);
type CreatePublicationResult =
  | { success: true; publication: any }
  | { success: false; error?: OAuthSessionError };

export async function createPublication({
  name,
  description,
  iconFile,
  subdomain,
  preferences,
}: {
  name: string;
  description: string;
  iconFile: File | null;
  subdomain: string;
  preferences: Omit<PubLeafletPublication.Preferences, "$type">;
}): Promise<CreatePublicationResult> {
  let isSubdomainValid = subdomainValidator.safeParse(subdomain);
  if (!isSubdomainValid.success) {
    return { success: false };
  }
  let identity = await getIdentityData();
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

  let domain = `${subdomain}.leaflet.pub`;

  const sessionResult = await restoreOAuthSession(identity.atp_did);
  if (!sessionResult.ok) {
    return { success: false, error: sessionResult.error };
  }
  let credentialSession = sessionResult.value;
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );

  // Use site.standard.publication for new publications
  const publicationType = getPublicationType();
  const url = `https://${domain}`;

  // Build record based on publication type
  let record: SiteStandardPublication.Record | PubLeafletPublication.Record;
  let iconBlob: Awaited<ReturnType<typeof agent.com.atproto.repo.uploadBlob>>["data"]["blob"] | undefined;

  // Upload the icon if provided
  if (iconFile && iconFile.size > 0) {
    const buffer = await iconFile.arrayBuffer();
    const uploadResult = await agent.com.atproto.repo.uploadBlob(
      new Uint8Array(buffer),
      { encoding: iconFile.type },
    );
    iconBlob = uploadResult.data.blob;
  }

  if (publicationType === "site.standard.publication") {
    record = {
      $type: "site.standard.publication",
      name,
      url,
      ...(description && { description }),
      ...(iconBlob && { icon: iconBlob }),
      basicTheme: {
        $type: "site.standard.theme.basic",
        background: { $type: "site.standard.theme.color#rgb", ...PubThemeDefaultsRGB.background },
        foreground: { $type: "site.standard.theme.color#rgb", ...PubThemeDefaultsRGB.foreground },
        accent: { $type: "site.standard.theme.color#rgb", ...PubThemeDefaultsRGB.accent },
        accentForeground: { $type: "site.standard.theme.color#rgb", ...PubThemeDefaultsRGB.accentForeground },
      },
      preferences: {
        showInDiscover: preferences.showInDiscover,
        showComments: preferences.showComments,
        showMentions: preferences.showMentions,
        showPrevNext: preferences.showPrevNext,
      },
    } satisfies SiteStandardPublication.Record;
  } else {
    record = {
      $type: "pub.leaflet.publication",
      name,
      base_path: domain,
      ...(description && { description }),
      ...(iconBlob && { icon: iconBlob }),
      preferences,
    } satisfies PubLeafletPublication.Record;
  }

  let { data: result } = await agent.com.atproto.repo.putRecord({
    repo: credentialSession.did!,
    rkey: TID.nextStr(),
    collection: publicationType,
    record,
    validate: false,
  });

  //optimistically write to our db!
  let { data: publication } = await supabaseServerClient
    .from("publications")
    .upsert({
      uri: result.uri,
      identity_did: credentialSession.did!,
      name,
      record: record as unknown as Json,
    })
    .select()
    .single();

  // Create the custom domain
  if (isProductionDomain()) {
    await vercel.projects.addProjectDomain({
      idOrName: "prj_9jX4tmYCISnm176frFxk07fF74kG",
      teamId: "team_42xaJiZMTw9Sr7i0DcLTae9d",
      requestBody: {
        name: domain,
      },
    });
  }
  await supabaseServerClient
    .from("custom_domains")
    .insert({ domain, confirmed: true, identity: null });

  await supabaseServerClient
    .from("publication_domains")
    .insert({ domain, publication: result.uri, identity: identity.atp_did });

  return { success: true, publication };
}
