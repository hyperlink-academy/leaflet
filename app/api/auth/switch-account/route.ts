import { NextRequest, NextResponse } from "next/server";
import { supabaseServerClient } from "supabase/serverClient";
import { resolveAuthToken, setAuthToken } from "src/auth";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Rewrites the session cookie to another token this browser holds; possession
// of the token id is the credential. With logoutCurrent the old session is
// revoked in the same request, so the cookie moves straight between sessions
// with no logged-out window. This is a route handler rather than a server
// action because cookie writes in an action make Next re-render the current
// route in place, flashing a half-switched page before the caller's full
// navigation lands.
export async function POST(req: NextRequest) {
  let body: { token?: unknown; logoutCurrent?: unknown };
  try {
    body = (await req.json()) as { token?: unknown; logoutCurrent?: unknown };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { token, logoutCurrent } = body;
  if (typeof token !== "string" || !UUID_REGEX.test(token))
    return NextResponse.json({ ok: false }, { status: 400 });

  const resolved = await resolveAuthToken(token);
  if (!resolved) return NextResponse.json({ ok: false }, { status: 401 });

  const current = req.cookies.get("auth_token")?.value;
  if (logoutCurrent === true && current && current !== token)
    await supabaseServerClient
      .from("email_auth_tokens")
      .delete()
      .eq("id", current);

  await setAuthToken(token);
  return NextResponse.json({ ok: true, identity: resolved.identity.id });
}
