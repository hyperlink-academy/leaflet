import { OAuthClientMetadata } from "@atproto/oauth-client-node";
import { createIdentity } from "actions/createIdentity";
import { drizzle } from "drizzle-orm/postgres-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { createOauthClient } from "src/atproto-oauth";

import { supabaseServerClient } from "supabase/serverClient";

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
          let existingIdentity = cookies().get("auth_token");
          if (existingIdentity) {
            let data = await supabaseServerClient
              .from("email_auth_tokens")
              .select("*, identities(*)")
              .single();
            if (data.data?.identity && data.data.confirmed)
              await supabaseServerClient
                .from("identities")
                .update({ atp_did: session.did })
                .eq("id", data.data.identity);
            return;
          }
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
