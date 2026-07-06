import { NextRequest } from "next/server";
import { supabaseServerClient } from "supabase/serverClient";
export const preferredRegion = [];
export async function GET(req: NextRequest) {
  const host = req.headers.get("host");
  const response = new Response("Logged out successfully", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });

  // Get the base domain from the host
  const domain = host?.includes(":") ? host.split(":")[0] : host;
  // Revoke both the first-party session and the cross-domain mirror delivered
  // to custom domains — on those, only external_auth_token exists.
  let tokens = [
    ...new Set([
      req.cookies.get("auth_token")?.value,
      req.cookies.get("external_auth_token")?.value,
    ]),
  ].filter((t): t is string => !!t);
  if (tokens.length > 0)
    await supabaseServerClient
      .from("email_auth_tokens")
      .delete()
      .in("id", tokens);

  // Clear the auth_token cookie on both the base domain and the domain with a leading dot
  response.headers.append(
    "Set-Cookie",
    `auth_token=; Path=/; Domain=${domain}; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
  );
  response.headers.append(
    "Set-Cookie",
    `auth_token=; Path=/; Domain=.${domain}; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
  );
  // external_auth_token is set host-only by the middleware, so it must be
  // cleared host-only (no Domain attribute) for the cookie names to match.
  response.headers.append(
    "Set-Cookie",
    `external_auth_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
  );

  return response;
}
