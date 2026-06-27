import { requestAuthEmailToken } from "actions/emailAuth";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_TOKEN_COOKIE, resolveAuthToken } from "src/auth";
import { postAuthRedirect } from "src/postAuthRedirect";
import { publicationUriForHost } from "src/utils/publicationForHost";
import { applyAfterSignInAction } from "src/emailSubscription";
import { parseActionFromSearchParam } from "app/api/oauth/[route]/afterSignInActions";
import { supabaseServerClient } from "supabase/serverClient";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";

// Custom-domain email login bounces here first. If the user already has a
// session on the main site for this same email we hand it straight back to the
// originating domain. Otherwise — no session, or a session for a different
// account — we email a fresh code and route them to the main-site confirm page,
// so the canonical session is minted first-party here before bouncing back.
export async function GET(req: NextRequest) {
  let email = req.nextUrl.searchParams.get("email");
  // Callers pass an absolute redirect (window.location.href); default to the
  // main-site origin so postAuthRedirect and NextResponse.redirect never get a
  // relative URL.
  let redirect = req.nextUrl.searchParams.get("redirect") || req.nextUrl.origin;
  let action = req.nextUrl.searchParams.get("action");

  if (!email) return NextResponse.redirect(redirect);

  let existing = await resolveAuthToken(
    (await cookies()).get(AUTH_TOKEN_COOKIE)?.value,
  );
  // Only reuse the session when it authenticates the same email the user is
  // signing in with; a different (or atproto-only) session must not silently
  // log them into the wrong account.
  if (
    existing &&
    existing.identity.email?.toLowerCase() === email.toLowerCase()
  ) {
    let finalRedirect = await applyAfterSignInAction(
      action,
      redirect,
      existing.identity.email,
      existing.identity.id,
    );
    return NextResponse.redirect(
      await postAuthRedirect(finalRedirect, existing.tokenId),
    );
  }

  // A `subscribe` action means the user is subscribing, not just signing in —
  // send the subscription confirmation email (publication name/url) instead of
  // the generic auth code.
  let subscribePublication = parseActionFromSearchParam(action)?.publication;
  let subscription = subscribePublication
    ? await resolveSubscriptionEmailContext(subscribePublication)
    : undefined;

  let tokenId = await requestAuthEmailToken(email, subscription);
  let confirmUrl = new URL("/login/confirm", req.nextUrl.origin);
  confirmUrl.searchParams.set("token", tokenId);
  confirmUrl.searchParams.set("email", email);
  confirmUrl.searchParams.set("redirect", redirect);
  if (action) confirmUrl.searchParams.set("action", action);
  let publicationUri =
    subscribePublication ||
    (await publicationUriForHost(new URL(redirect).host));
  if (publicationUri) confirmUrl.searchParams.set("publication", publicationUri);
  return NextResponse.redirect(confirmUrl.toString());
}

async function resolveSubscriptionEmailContext(publicationUri: string) {
  const { data: publication } = await supabaseServerClient
    .from("publications")
    .select("record")
    .eq("uri", publicationUri)
    .maybeSingle();
  const normalized = normalizePublicationRecord(publication?.record);
  return {
    publicationName: normalized?.name,
    publicationUrl: normalized?.url,
  };
}
