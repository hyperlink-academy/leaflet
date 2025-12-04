"use server";
import { TID } from "@atproto/common";
import {
  AtpBaseClient,
  PubLeafletPublication,
  PubLeafletThemeColor,
} from "lexicons/api";
import { createOauthClient } from "src/atproto-oauth";
import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";
import { AtUri } from "@atproto/syntax";
import { $Typed } from "@atproto/api";

export async function updatePublication({
  uri,
  name,
  description,
  iconFile,
  preferences,
}: {
  uri: string;
  name: string;
  description: string;
  iconFile: File | null;
  preferences?: Omit<PubLeafletPublication.Preferences, "$type">;
}) {
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return;

  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let { data: existingPub } = await supabaseServerClient
    .from("publications")
    .select("*")
    .eq("uri", uri)
    .single();
  if (!existingPub || existingPub.identity_did !== identity.atp_did) return;
  let aturi = new AtUri(existingPub.uri);

  let record: PubLeafletPublication.Record = {
    $type: "pub.leaflet.publication",
    ...(existingPub.record as object),
    name,
  };
  if (preferences) {
    record.preferences = preferences;
  }

  if (description !== undefined) {
    record.description = description;
  }

  // Upload the icon if provided How do I tell if there isn't a new one?
  if (iconFile && iconFile.size > 0) {
    const buffer = await iconFile.arrayBuffer();
    const uploadResult = await agent.com.atproto.repo.uploadBlob(
      new Uint8Array(buffer),
      { encoding: iconFile.type },
    );

    if (uploadResult.data.blob) {
      record.icon = uploadResult.data.blob;
    }
  }

  let result = await agent.com.atproto.repo.putRecord({
    repo: credentialSession.did!,
    rkey: aturi.rkey,
    record,
    collection: record.$type,
    validate: false,
  });

  //optimistically write to our db!
  let { data: publication, error } = await supabaseServerClient
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

export async function updatePublicationBasePath({
  uri,
  base_path,
}: {
  uri: string;
  base_path: string;
}) {
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return;

  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let { data: existingPub } = await supabaseServerClient
    .from("publications")
    .select("*")
    .eq("uri", uri)
    .single();
  if (!existingPub || existingPub.identity_did !== identity.atp_did) return;
  let aturi = new AtUri(existingPub.uri);

  let record: PubLeafletPublication.Record = {
    ...(existingPub.record as PubLeafletPublication.Record),
    base_path,
  };

  let result = await agent.com.atproto.repo.putRecord({
    repo: credentialSession.did!,
    rkey: aturi.rkey,
    record,
    collection: record.$type,
    validate: false,
  });

  //optimistically write to our db!
  let { data: publication, error } = await supabaseServerClient
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
    primary: Color;
    pageBackground: Color;
    showPageBackground: boolean;
    accentBackground: Color;
    accentText: Color;
  };
}) {
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return;

  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let { data: existingPub } = await supabaseServerClient
    .from("publications")
    .select("*")
    .eq("uri", uri)
    .single();
  if (!existingPub || existingPub.identity_did !== identity.atp_did) return;
  let aturi = new AtUri(existingPub.uri);

  let oldRecord = existingPub.record as PubLeafletPublication.Record;
  let record: PubLeafletPublication.Record = {
    ...oldRecord,
    $type: "pub.leaflet.publication",
    theme: {
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
          : oldRecord.theme?.backgroundImage,
      backgroundColor: theme.backgroundColor
        ? {
            ...theme.backgroundColor,
          }
        : undefined,
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
    },
  };

  let result = await agent.com.atproto.repo.putRecord({
    repo: credentialSession.did!,
    rkey: aturi.rkey,
    record,
    collection: record.$type,
    validate: false,
  });

  //optimistically write to our db!
  let { data: publication, error } = await supabaseServerClient
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
