import { NextRequest } from "next/server";
export const runtime = "edge";
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
