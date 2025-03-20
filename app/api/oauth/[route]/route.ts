import { OAuthClientMetadata } from "@atproto/oauth-client-node";
import { createIdentity } from "actions/createIdentity";
import { drizzle } from "drizzle-orm/postgres-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { createOauthClient } from "src/atproto-oauth";

import { supabaseServerClient } from "supabase/serverClient";
const hostname =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://leaflet.pub";

const localconfig: OAuthClientMetadata = {
  client_id: `http://localhost/?redirect_uri=${encodeURI(`http://127.0.0.1:3000/api/oauth/callback`)}&scope=${encodeURIComponent("atproto transition:generic")}`,
  client_name: `Leaflet`,
  client_uri: hostname,
  redirect_uris: [`http://127.0.0.1:3000/api/oauth/callback`],
  grant_types: [`authorization_code`, `refresh_token`],
  response_types: [`code`],
  application_type: `web`,
  scope: "atproto transition:generic",
  token_endpoint_auth_method: `none`,
  dpop_bound_access_tokens: true,
};

const prodconfig: OAuthClientMetadata = {
  client_id: `${hostname}/api/oauth/metadata`,
  client_name: `Leaflet`,
  client_uri: hostname,
  logo_uri: `${hostname}/logo.png`,
  tos_uri: `${hostname}/tos`,
  policy_uri: `${hostname}/policy`,
  redirect_uris:
    process.env.NODE_ENV === "development"
      ? [`http://127.0.0.1:3000/api/oauth/callback`]
      : [`https://leaflet.pub/api/oauth/callback`],
  grant_types: [`authorization_code`, `refresh_token`],
  response_types: [`code`],
  application_type: `web`,
  scope: "atproto transition:generic",
  token_endpoint_auth_method: `private_key_jwt`,
  token_endpoint_auth_signing_alg: "ES256",
  dpop_bound_access_tokens: true,
  jwks_uri: `${hostname}/api/oauth/jwks`,
};
export const oauth_metadata =
  process.env.NODE_ENV === "development" ? localconfig : prodconfig;

type OauthRequestClientState = {
  redirect: string | null;
};
export async function GET(
  req: NextRequest,
  { params }: { params: { route: string; handle?: string } },
) {
  let client = await createOauthClient();
  switch (params.route) {
    case "metadata":
      return NextResponse.json(client.clientMetadata);
    case "jwks":
      return NextResponse.json(client.jwks);
    case "login": {
      const searchParams = req.nextUrl.searchParams;
      const handle = searchParams.get("handle") as string;
      // Put originating page here!
      let redirect = searchParams.get("redirect_url");
      let state: OauthRequestClientState = { redirect };

      // Revoke any pending authentication requests if the connection is closed (optional)
      const ac = new AbortController();

      const url = await client.authorize(handle, {
        scope: "atproto transition:generic",
        signal: ac.signal,
        state: JSON.stringify(state),
        // Only supported if OAuth server is openid-compliant
        ui_locales: "fr-CA fr en",
      });

      return NextResponse.redirect(url);
    }
    case "callback": {
      const params = new URLSearchParams(req.url.split("?")[1]);
      console.log(params);

      let redirectPath = "/lish";
      try {
        const { session, state } = await client.callback(params);
        let s: OauthRequestClientState = JSON.parse(state || "{}");
        redirectPath = s.redirect || "/lish";
        let { data: identity } = await supabaseServerClient
          .from("identities")
          .select()
          .eq("atp_did", session.did)
          .single();
        if (!identity) {
          const client = postgres(process.env.DB_URL as string, {
            idle_timeout: 5,
          });
          const db = drizzle(client);
          identity = await createIdentity(db, { atp_did: session.did });
        }
        let { data: token } = await supabaseServerClient
          .from("email_auth_tokens")
          .insert({
            identity: identity.id,
            confirmed: true,
            confirmation_code: "",
          })
          .select()
          .single();

        if (token)
          cookies().set("auth_token", token.id, {
            maxAge: 60 * 60 * 24 * 365,
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            sameSite: "lax",
          });

        // Process successful authentication here
        console.log("authorize() was called with state:", state);

        console.log("User authenticated as:", session.did);
      } catch (e) {
        redirect(redirectPath);
      }
      return redirect(redirectPath);
    }
    default:
      return NextResponse.json({ error: "Invalid route" }, { status: 404 });
  }
}
