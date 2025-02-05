import { OAuthClientMetadata } from "@atproto/oauth-client-node";
import { NextRequest, NextResponse } from "next/server";
import { createOauthClient } from "src/atproto-oauth";

const hostname =
  process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:3000"
    : "https://leaflet.pub";
export const oauth_metadata: OAuthClientMetadata = {
  client_id: `${hostname}/api/oauth/metadata`,
  client_name: `Leaflet`,
  client_uri: hostname,
  logo_uri: `${hostname}/logo.png`,
  tos_uri: `${hostname}/tos`,
  policy_uri: `${hostname}/policy`,
  redirect_uris: [`${hostname}/callback`], //why is this an array??
  grant_types: [`authorization_code`, `refresh_token`],
  response_types: [`code`],
  application_type: `web`,
  token_endpoint_auth_method: `private_key_jwt`,
  dpop_bound_access_tokens: true,
  jwks_uri: `${hostname}/api/oauth/jwks`,
};
export async function GET(
  req: NextRequest,
  { params }: { params: { route: string } },
) {
  let client = await createOauthClient();
  switch (params.route) {
    case "metadata":
      return NextResponse.json(oauth_metadata);
    case "jwks":
      return NextResponse.json(client.jwks);
    default:
      return NextResponse.json({ error: "Invalid route" }, { status: 404 });
  }
}
