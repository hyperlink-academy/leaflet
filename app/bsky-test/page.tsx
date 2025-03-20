import { createClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
import { CreatePublication } from "./components";
import { AtpBaseClient, PubLeafletPagesLinearDocument } from "lexicons/src";
import { CredentialSession } from "@atproto/api";
import { createOauthClient } from "src/atproto-oauth";
import { getIdentityData } from "actions/getIdentityData";
import Link from "next/link";
import { IdResolver } from "@atproto/identity";

const idResolver = new IdResolver();
let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);
export default async function BskyPage() {
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did)
    return (
      <div>
        <form action="/api/oauth/login" method="GET">
          <input
            type="text"
            name="handle"
            placeholder="Enter handle"
            required
          />
          <button type="submit">Login</button>
        </form>
      </div>
    );
  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let did = await idResolver.did.resolve(identity.atp_did);
  let publications = await supabase
    .from("publications")
    .select()
    .eq("identity_did", credentialSession.did!);
  return (
    <div>
      <div>did: {credentialSession.did}</div>
      <h2>publications</h2>
      {publications.data?.map((d) => (
        <Link
          href={`/bsky-test/${did?.alsoKnownAs?.[0].slice(5)}/${d.name}/`}
          key={d.uri}
        >
          <div key={d.uri}>{d.name}</div>
        </Link>
      ))}
      <CreatePublication />
    </div>
  );
}
