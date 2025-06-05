import { NextRequest } from "next/server";
import { supabaseServerClient } from "supabase/serverClient";
export const runtime = "edge";
export const preferredRegion = [];
export const dynamic = "force-dynamic";

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
  let token = req.cookies.get("auth_token");
  if (token)
    supabaseServerClient.from("email_auth_tokens").delete().eq("id", token);

  // Clear the auth_token cookie on both the base domain and the domain with a leading dot
  response.headers.append(
    "Set-Cookie",
    `auth_token=; Path=/; Domain=${domain}; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
  );
  response.headers.append(
    "Set-Cookie",
    `auth_token=; Path=/; Domain=.${domain}; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
  );

  return response;
}
