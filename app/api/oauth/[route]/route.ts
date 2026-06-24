import {
  backfillAtprotoSubscriptionsForIdentity,
  subscribeToPublication,
} from "app/(app)/lish/subscribeToPublication";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { createOauthClient } from "src/atproto-oauth";
import {
  AUTH_TOKEN_COOKIE,
  resolveAuthToken,
  setAuthToken,
  setPendingMergeToken,
} from "src/auth";

import { supabaseServerClient } from "supabase/serverClient";
import { URLSearchParams } from "url";
import {
  ActionAfterSignIn,
  encodeActionToSearchParam,
  parseActionFromSearchParam,
} from "./afterSignInActions";
import { inngest } from "app/api/inngest/client";
import { idResolver } from "src/identity";
import { mergeEmailIdentityIntoAtpIdentity } from "src/mergeIdentity";
import { postAuthRedirect } from "src/postAuthRedirect";
import { buildOauthLoginUrl } from "src/utils/customDomain";

type OauthRequestClientState = {
  redirect: string | null;
  action: ActionAfterSignIn | null;
  link?: boolean;
  // Auto-confirm a cross-identity merge instead of routing to /merge-accounts.
  // Set when the caller already showed an in-context "link this account?"
  // confirmation (e.g. the subscribe-flow LinkIdentityModal).
  autoMerge?: boolean;
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
      const autoMerge = searchParams.get("autoMerge") === "true";
      // Put originating page here! searchParams.get already percent-decodes
      // once, matching the single encode at the call sites — don't decode again.
      let redirect = searchParams.get("redirect_url");
      let action = parseActionFromSearchParam(searchParams.get("action"));
      // Forces the PDS round-trip even with a valid session — used to refresh an
      // expired atproto OAuth session whose leaflet auth_token is still good.
      const reauth = searchParams.get("reauth") === "true";

      // Already authenticated on the main site with a full atproto session: skip
      // the PDS round-trip and hand the session straight back to the originating
      // domain (handleAction delivers it cross-domain via postAuthRedirect).
      // Requires atp_did so email-only sessions still reach the PDS (e.g.
      // subscribe needs atproto); link/signup/reauth always fall through. If a
      // specific handle was requested, only reuse the session when it resolves
      // to that same identity — otherwise the user is choosing a different
      // account and must authenticate fresh.
      if (!link && !signup && !reauth) {
        let existing = await resolveAuthToken(
          (await cookies()).get(AUTH_TOKEN_COOKIE)?.value,
        );
        let sessionDid = existing?.identity.atp_did;
        if (existing && sessionDid) {
          // No specific handle requested → reuse the session. A handle was
          // requested → reuse only if it resolves to the same identity;
          // a different or unresolvable handle falls through to the PDS.
          if (!handle)
            return handleAction(action, redirect || "/", existing.tokenId, true);
          if ((await resolveToDid(handle)) === sessionDid)
            return handleAction(action, redirect || "/", existing.tokenId, true);
        }
      }

      let state: OauthRequestClientState = {
        redirect,
        action,
        link,
        autoMerge,
      };

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
        redirectPath = s.redirect || "/";
        let { data: identity } = await supabaseServerClient
          .from("identities")
          .select()
          .eq("atp_did", session.did)
          .single();

        const currentAuthToken = (await cookies()).get(
          AUTH_TOKEN_COOKIE,
        )?.value;
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
        // to the existing email identity or route to /merge-accounts (or merge
        // inline if autoMerge is set).
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
            await backfillAtprotoSubscriptionsForIdentity(
              currentIdentity.id,
              session.did,
            );
            return handleAction(s.action, redirectPath, currentAuthToken ?? null);
          }
          if (identity.id !== currentIdentity.id) {
            if (s.autoMerge) {
              const merged = await mergeEmailIdentityIntoAtpIdentity({
                sourceId: currentIdentity.id,
                targetId: identity.id,
              });
              if (merged.ok) {
                // Source identity is gone; clear it so the cross-identity
                // merge block below doesn't try to merge a deleted row.
                currentIdentity = null;
              } else {
                console.error(
                  "[oauth/callback] autoMerge failed:",
                  merged.error,
                );
                await stagePendingMerge(identity.id, redirectPath);
              }
            } else {
              await stagePendingMerge(identity.id, redirectPath);
              // Only reached if the token insert failed. Fall through to the
              // normal sign-in flow rather than blocking the user.
            }
          }
          // Same identity already linked — fall through to refresh session.
        }

        if (!identity) {
          if (currentIdentity && !currentIdentity.atp_did) {
            await supabaseServerClient
              .from("identities")
              .update({ atp_did: session.did })
              .eq("id", currentIdentity.id);
            await backfillAtprotoSubscriptionsForIdentity(
              currentIdentity.id,
              session.did,
            );
            return handleAction(s.action, redirectPath, currentAuthToken ?? null);
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
          // *different* email-only identity. Either merge inline (autoMerge
          // means the caller already collected the user's confirmation) or
          // stage a pending merge for /merge-accounts.
          if (s.autoMerge) {
            const merged = await mergeEmailIdentityIntoAtpIdentity({
              sourceId: currentIdentity.id,
              targetId: identity.id,
            });
            if (!merged.ok) {
              console.error("[oauth/callback] autoMerge failed:", merged.error);
              await stagePendingMerge(identity.id, redirectPath);
            }
          } else {
            await stagePendingMerge(identity.id, redirectPath);
            // Only reached if the token insert failed — fall through.
          }
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
        if (token) await setAuthToken(token.id);

        return handleAction(
          s.action,
          redirectPath,
          token?.id ?? currentAuthToken ?? null,
        );
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
const stagePendingMerge = async (identityId: string, redirectPath: string) => {
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
    console.error("[oauth/callback] pending merge token insert failed:", error);
  if (!targetToken) return;
  await setPendingMergeToken(targetToken.id);
  redirect(`/merge-accounts?redirect=${encodeURIComponent(redirectPath)}`);
};

// Resolves a requested handle (or passthrough did) to a did so it can be
// compared against the current session's identity. Returns null when the handle
// can't be resolved, so the caller falls through to a fresh PDS login rather
// than reusing a session that may not match.
const resolveToDid = async (handle: string): Promise<string | null> => {
  let trimmed = handle.trim().replace(/^@/, "");
  if (!trimmed) return null;
  if (trimmed.startsWith("did:")) return trimmed;
  try {
    return (await idResolver.handle.resolve(trimmed)) ?? null;
  } catch {
    return null;
  }
};

const handleAction = async (
  action: ActionAfterSignIn | null,
  redirectPath: string,
  authTokenId: string | null,
  // The session-reuse fast-path skips the PDS round-trip, so a stale atproto
  // session surfaces here as a failed subscribe. Force a fresh PDS login and
  // retry rather than dropping the user back unsubscribed with no error.
  reauthOnSubscribeFailure = false,
) => {
  let isAbsolute = redirectPath.includes("://");
  let url = new URL(
    redirectPath,
    isAbsolute ? undefined : "https://example.com",
  );

  if (action?.action === "subscribe") {
    let result = await subscribeToPublication(action.publication);
    if (!result.success && reauthOnSubscribeFailure)
      return redirect(
        buildOauthLoginUrl({
          reauth: true,
          action: encodeActionToSearchParam(action),
          redirect: redirectPath,
        }),
      );
    if (result.success && result.hasFeed === false)
      url.searchParams.set("showSubscribeSuccess", "true");
  }

  if (isAbsolute) return redirect(await postAuthRedirect(url.toString(), authTokenId));
  let path = url.pathname;
  if (url.search) path += url.search;
  if (url.hash) path += url.hash;
  return redirect(path);
};
