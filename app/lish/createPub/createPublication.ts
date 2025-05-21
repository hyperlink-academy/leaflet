"use server";
import { TID } from "@atproto/common";
import { AtpBaseClient, PubLeafletPublication } from "lexicons/api";
import { createOauthClient } from "src/atproto-oauth";
import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { Un$Typed } from "@atproto/api";
import { Json } from "supabase/database.types";
import { Vercel } from "@vercel/sdk";
import { isProductionDomain } from "src/utils/isProductionDeployment";
import { string } from "zod";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const vercel = new Vercel({
  bearerToken: VERCEL_TOKEN,
});
let subdomainValidator = string()
  .min(3)
  .max(63)
  .regex(/^[a-z0-9-]+$/);
export async function createPublication({
  name,
  description,
  iconFile,
  subdomain,
}: {
  name: string;
  description: string;
  iconFile: File | null;
  subdomain: string;
}) {
  let isSubdomainValid = subdomainValidator.safeParse(subdomain);
  if (!isSubdomainValid.success) {
    return { success: false };
  }
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return;

  let domain = `${subdomain}.leaflet.pub`;

  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let record: Un$Typed<PubLeafletPublication.Record> = {
    name,
    base_path: domain,
  };

  if (description) {
    record.description = description;
  }

  // Upload the icon if provided
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

  let result = await agent.pub.leaflet.publication.create(
    { repo: credentialSession.did!, rkey: TID.nextStr(), validate: false },
    record,
  );

  //optimistically write to our db!
  let { data: publication } = await supabaseServerClient
    .from("publications")
    .upsert({
      uri: result.uri,
      identity_did: credentialSession.did!,
      name: record.name,
      record: {
        ...record,
        $type: "pub.leaflet.publication",
      } as unknown as Json,
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
