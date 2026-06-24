import { requestAuthEmailToken } from "actions/emailAuth";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_TOKEN_COOKIE, resolveAuthToken } from "src/auth";
import { postAuthRedirect } from "src/crossSiteAuth";

// Custom-domain email login bounces here first. If the user already has a
// session on the main site for this same email we hand it straight back to the
// originating domain. Otherwise — no session, or a session for a different
// account — we email a fresh code and route them to the main-site confirm page,
// so the canonical session is minted first-party here before bouncing back.
export async function GET(req: NextRequest) {
  let email = req.nextUrl.searchParams.get("email");
  let redirect = req.nextUrl.searchParams.get("redirect") || "/";

  if (!email)
    return NextResponse.redirect(new URL(redirect, req.nextUrl.origin));

  let existing = await resolveAuthToken(
    (await cookies()).get(AUTH_TOKEN_COOKIE)?.value,
  );
  // Only reuse the session when it authenticates the same email the user is
  // signing in with; a different (or atproto-only) session must not silently
  // log them into the wrong account.
  if (existing && existing.identity.email?.toLowerCase() === email.toLowerCase())
    return NextResponse.redirect(
      await postAuthRedirect(redirect, existing.tokenId),
    );

  let tokenId = await requestAuthEmailToken(email);
  let confirmUrl = new URL("/login/confirm", req.nextUrl.origin);
  confirmUrl.searchParams.set("token", tokenId);
  confirmUrl.searchParams.set("email", email);
  confirmUrl.searchParams.set("redirect", redirect);
  return NextResponse.redirect(confirmUrl.toString());
}
