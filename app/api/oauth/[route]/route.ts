import { createIdentity } from "actions/createIdentity";
import { subscribeToPublication } from "app/lish/subscribeToPublication";
import { drizzle } from "drizzle-orm/postgres-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { createOauthClient } from "src/atproto-oauth";
import { setAuthToken } from "src/auth";

import { supabaseServerClient } from "supabase/serverClient";
import { URLSearchParams } from "url";
import {
  ActionAfterSignIn,
  parseActionFromSearchParam,
} from "./afterSignInActions";

type OauthRequestClientState = {
  redirect: string | null;
  action: ActionAfterSignIn | null;
};

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ route: string; handle?: string }> },
) {
  const params = await props.params;
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
      let action = parseActionFromSearchParam(searchParams.get("action"));
      let state: OauthRequestClientState = { redirect, action };

      // Revoke any pending authentication requests if the connection is closed (optional)
      const ac = new AbortController();

      const url = await client.authorize(handle || "https://bsky.social", {
        scope: "atproto transition:generic",
        signal: ac.signal,
        state: JSON.stringify(state),
      });

      return NextResponse.redirect(url);
    }
    case "callback": {
      const params = new URLSearchParams(req.url.split("?")[1]);

      //TODO remember to reset this to a better default!
      let redirectPath = "/lish";
      try {
        const { session, state } = await client.callback(params);
        let s: OauthRequestClientState = JSON.parse(state || "{}");
        redirectPath = s.redirect || "/";
        let { data: identity } = await supabaseServerClient
          .from("identities")
          .select()
          .eq("atp_did", session.did)
          .single();
        if (!identity) {
          let existingIdentity = (await cookies()).get("auth_token");
          if (existingIdentity) {
            let data = await supabaseServerClient
              .from("email_auth_tokens")
              .select("*, identities(*)")
              .eq("id", existingIdentity.value)
              .single();
            if (data.data?.identity && data.data.confirmed)
              await supabaseServerClient
                .from("identities")
                .update({ atp_did: session.did })
                .eq("id", data.data.identity);

            return handleAction(s.action, redirectPath);
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

        if (token) await setAuthToken(token.id);

        // Process successful authentication here
        console.log("authorize() was called with state:", state);

        console.log("User authenticated as:", session.did);
        return handleAction(s.action, redirectPath);
      } catch (e) {
        redirect(redirectPath);
      }
    }
    default:
      return NextResponse.json({ error: "Invalid route" }, { status: 404 });
  }
}

const handleAction = async (
  action: ActionAfterSignIn | null,
  redirectPath: string,
) => {
  let [base, pathparams] = redirectPath.split("?");
  let searchParams = new URLSearchParams(pathparams);
  if (action?.action === "subscribe") {
    let result = await subscribeToPublication(action.publication);
    console.log(result);
    if (result.hasFeed === false)
      searchParams.set("showSubscribeSuccess", "true");
  }

  return redirect(base + "?" + searchParams.toString());
};
