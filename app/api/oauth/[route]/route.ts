import { subscribeToPublication } from "app/lish/subscribeToPublication";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { createOauthClient } from "src/atproto-oauth";
import {
  AUTH_TOKEN_COOKIE,
  setAuthToken,
  setPendingMergeToken,
} from "src/auth";

import { supabaseServerClient } from "supabase/serverClient";
import { URLSearchParams } from "url";
import {
  ActionAfterSignIn,
  parseActionFromSearchParam,
} from "./afterSignInActions";
import { inngest } from "app/api/inngest/client";

type OauthRequestClientState = {
  redirect: string | null;
  action: ActionAfterSignIn | null;
  link?: boolean;
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
      const signup = searchParams.get("signup") === "true";
      const link = searchParams.get("link") === "true";
      // Put originating page here!
      let redirect = searchParams.get("redirect_url");
      if (redirect) redirect = decodeURIComponent(redirect);
      let action = parseActionFromSearchParam(searchParams.get("action"));
      let state: OauthRequestClientState = { redirect, action, link };

      // Revoke any pending authentication requests if the connection is closed (optional)
      const ac = new AbortController();

      const url = await client.authorize(handle || "https://bsky.social", {
        scope:
          "atproto account:email?action=read include:pub.leaflet.authFullPermissions include:site.standard.authFull include:app.bsky.authCreatePosts include:app.bsky.authViewAll?aud=did:web:api.bsky.app%23bsky_appview rpc:parts.page.mention.search?aud=* blob:*/*",
        signal: ac.signal,
        state: JSON.stringify(state),
        ...(signup ? { prompt: "create" } : {}),
      });

      return NextResponse.redirect(url);
    }
    case "callback": {
      const params = new URLSearchParams(req.url.split("?")[1]);

      let redirectPath = "/";
      try {
        const { session, state } = await client.callback(params);
        let s: OauthRequestClientState = JSON.parse(state || "{}");
        redirectPath = decodeURIComponent(s.redirect || "/");
        let { data: identity } = await supabaseServerClient
          .from("identities")
          .select()
          .eq("atp_did", session.did)
          .single();

        const currentAuthToken = (await cookies()).get(AUTH_TOKEN_COOKIE)?.value;
        let currentIdentity: {
          id: string;
          email: string | null;
          atp_did: string | null;
        } | null = null;
        if (currentAuthToken) {
          const { data: currentTokenRow } = await supabaseServerClient
            .from("email_auth_tokens")
            .select("confirmed, identities(id, email, atp_did)")
            .eq("id", currentAuthToken)
            .single();
          if (currentTokenRow?.confirmed)
            currentIdentity = currentTokenRow.identities;
        }

        // Explicit link flow from the LoginModal for an email-only user. Never
        // fall through to a normal DID login — we must either attach the atp_did
        // to the existing email identity or route to /merge-accounts.
        if (
          s.link &&
          currentIdentity &&
          currentIdentity.email &&
          !currentIdentity.atp_did
        ) {
          if (!identity) {
            await supabaseServerClient
              .from("identities")
              .update({ atp_did: session.did })
              .eq("id", currentIdentity.id);
            return handleAction(s.action, redirectPath);
          }
          if (identity.id !== currentIdentity.id) {
            await stagePendingMerge(identity.id, redirectPath);
            // Only reached if the token insert failed. Fall through to the
            // normal sign-in flow rather than blocking the user.
          }
          // Same identity already linked — fall through to refresh session.
        }

        if (!identity) {
          if (currentIdentity && !currentIdentity.atp_did) {
            await supabaseServerClient
              .from("identities")
              .update({ atp_did: session.did })
              .eq("id", currentIdentity.id);
            return handleAction(s.action, redirectPath);
          }
          const { data } = await supabaseServerClient
            .from("identities")
            .insert({ atp_did: session.did })
            .select()
            .single();
          identity = data;
        } else if (
          currentIdentity &&
          currentIdentity.id !== identity.id &&
          !currentIdentity.atp_did &&
          currentIdentity.email
        ) {
          // DID already has an identity row. Caller is currently signed in as a
          // *different* email-only identity. Stage a pending merge and let the
          // user confirm on /merge-accounts before we touch either account.
          await stagePendingMerge(identity.id, redirectPath);
          // Only reached if the token insert failed — fall through.
        }

        // Trigger migration if identity needs it
        const metadata = identity?.metadata as Record<string, unknown> | null;
        if (metadata?.needsStandardSiteMigration) {
          if (process.env.NODE_ENV === "production")
            await inngest.send({
              name: "user/migrate-to-standard",
              data: { did: session.did },
            });
        }

        let { data: token } = await supabaseServerClient
          .from("email_auth_tokens")
          .insert({
            identity: identity!.id,
            confirmed: true,
            confirmation_code: "",
          })
          .select()
          .single();
        console.log({ token });
        if (token) await setAuthToken(token.id);

        // Process successful authentication here
        console.log("authorize() was called with state:", state);

        console.log("User authenticated as:", session.did);
        return handleAction(s.action, redirectPath);
      } catch (e) {
        // `redirect()` throws a NEXT_REDIRECT error that Next.js needs to see
        // at the framework boundary — don't swallow it.
        if (
          e &&
          typeof e === "object" &&
          "digest" in e &&
          typeof (e as { digest?: unknown }).digest === "string" &&
          (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
        )
          throw e;
        console.log(e);
        redirect(redirectPath);
      }
    }
    default:
      return NextResponse.json({ error: "Invalid route" }, { status: 404 });
  }
}

// Mints a confirmed email_auth_token for `identityId`, stores it as the
// pending_merge_token cookie, and redirects to /merge-accounts. Throws on
// success (via `redirect()`), so callers only reach the line after the call
// when the token insert failed — at which point they should fall through to
// the normal sign-in flow rather than blocking the user.
const stagePendingMerge = async (
  identityId: string,
  redirectPath: string,
) => {
  const { data: targetToken, error } = await supabaseServerClient
    .from("email_auth_tokens")
    .insert({
      identity: identityId,
      confirmed: true,
      confirmation_code: "",
    })
    .select("id")
    .single();
  if (error)
    console.error(
      "[oauth/callback] pending merge token insert failed:",
      error,
    );
  if (!targetToken) return;
  await setPendingMergeToken(targetToken.id);
  redirect(`/merge-accounts?redirect=${encodeURIComponent(redirectPath)}`);
};

const handleAction = async (
  action: ActionAfterSignIn | null,
  redirectPath: string,
) => {
  let parsePath = decodeURIComponent(redirectPath);
  let url;
  if (parsePath.includes("://")) url = new URL(parsePath);
  else url = new URL(decodeURIComponent(redirectPath), "https://example.com");
  if (action?.action === "subscribe") {
    let result = await subscribeToPublication(action.publication);
    if (result.success && result.hasFeed === false)
      url.searchParams.set("showSubscribeSuccess", "true");
  }

  let path = url.pathname;
  if (url.search) path += url.search;
  if (url.hash) path += url.hash;
  return parsePath.includes("://") ? redirect(url.toString()) : redirect(path);
};
