import { AtUri } from "@atproto/syntax";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { Database } from "supabase/database.types";

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
  ],
};

let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

const auth_callback_route = "/auth_callback";
const receive_auth_callback_route = "/receive_auth_callback";
export default async function middleware(req: NextRequest) {
  let hostname = req.headers.get("host")!;
  if (req.nextUrl.pathname === auth_callback_route) return authCallback(req);
  if (req.nextUrl.pathname === receive_auth_callback_route)
    return receiveAuthCallback(req);

  if (hostname === "leaflet.pub") return;
  if (req.nextUrl.pathname === "/not-found") return;
  let { data: routes } = await supabase
    .from("custom_domains")
    .select(
      "*, custom_domain_routes(*), publication_domains(*, publications(*))",
    )
    .eq("domain", hostname)
    .single();

  let pub = routes?.publication_domains[0]?.publications;
  if (pub) {
    if (req.nextUrl.pathname.startsWith("/lish")) return;
    let cookie = req.cookies.get("external_auth_token");
    let isStaticReq =
      req.nextUrl.pathname.includes("/rss") ||
      req.nextUrl.pathname.includes("/atom") ||
      req.nextUrl.pathname.includes("/json");
    if (
      !isStaticReq &&
      (!cookie || req.nextUrl.searchParams.has("refreshAuth")) &&
      !req.nextUrl.searchParams.has("auth_completed") &&
      !hostname.includes("leaflet.pub")
    ) {
      return initiateAuthCallback(req);
    }
    let aturi = new AtUri(pub?.uri);
    return NextResponse.rewrite(
      new URL(
        `/lish/${aturi.host}/${encodeURIComponent(pub.name)}${req.nextUrl.pathname}`,
        req.url,
      ),
    );
  }
  if (routes) {
    let route = routes.custom_domain_routes.find(
      (r) => r.route === req.nextUrl.pathname,
    );
    if (route)
      return NextResponse.rewrite(
        new URL(`/${route.view_permission_token}`, req.url),
      );
    else {
      return NextResponse.redirect(new URL("/not-found", req.url));
    }
  }
}

type CROSS_SITE_AUTH_REQUEST = { redirect: string; ts: string };
type CROSS_SITE_AUTH_RESPONSE = {
  redirect: string;
  auth_token: string | null;
  ts: string;
};
async function initiateAuthCallback(req: NextRequest) {
  let redirectUrl = new URL(req.url);
  redirectUrl.searchParams.delete("refreshAuth");
  let token: CROSS_SITE_AUTH_REQUEST = {
    redirect: redirectUrl.toString(),
    ts: new Date().toISOString(),
  };
  let payload = btoa(JSON.stringify(token));
  let signature = await signCrossSiteToken(payload);
  return NextResponse.redirect(
    `https://leaflet.pub${auth_callback_route}?payload=${encodeURIComponent(payload)}&signature=${encodeURIComponent(signature)}`,
  );
}

async function authCallback(req: NextRequest) {
  let payload = req.nextUrl.searchParams.get("payload");
  let signature = req.nextUrl.searchParams.get("signature");

  if (typeof payload !== "string" || typeof signature !== "string")
    return new NextResponse("Payload or Signature not string", { status: 401 });

  payload = decodeURIComponent(payload);
  signature = decodeURIComponent(signature);

  let verifySig = await signCrossSiteToken(payload);
  if (verifySig !== signature)
    return new NextResponse("Incorrect Signature", { status: 401 });

  let token: CROSS_SITE_AUTH_REQUEST = JSON.parse(atob(payload));
  let auth_token = req.cookies.get("auth_token")?.value || null;
  let redirect_url = new URL(token.redirect);
  let response_token: CROSS_SITE_AUTH_RESPONSE = {
    redirect: token.redirect,
    auth_token,
    ts: new Date().toISOString(),
  };

  let response_payload = btoa(JSON.stringify(response_token));
  let sig = await signCrossSiteToken(response_payload);
  return NextResponse.redirect(
    `https://${redirect_url.host}${receive_auth_callback_route}?payload=${encodeURIComponent(response_payload)}&signature=${encodeURIComponent(sig)}`,
  );
}

async function receiveAuthCallback(req: NextRequest) {
  let payload = req.nextUrl.searchParams.get("payload");
  let signature = req.nextUrl.searchParams.get("signature");

  if (typeof payload !== "string" || typeof signature !== "string")
    return new NextResponse(null, { status: 401 });
  payload = decodeURIComponent(payload);
  signature = decodeURIComponent(signature);

  let verifySig = await signCrossSiteToken(payload);
  if (verifySig !== signature) return new NextResponse(null, { status: 401 });

  let token: CROSS_SITE_AUTH_RESPONSE = JSON.parse(atob(payload));

  let url = new URL(token.redirect);
  url.searchParams.set("auth_completed", "true");
  let response = NextResponse.redirect(token.redirect);
  response.cookies.set("external_auth_token", token.auth_token || "null");
  return response;
}

const signCrossSiteToken = async (input: string) => {
  if (!process.env.CROSS_SITE_AUTH_SECRET)
    throw new Error("Environment variable CROSS_SITE_AUTH_SECRET not set ");
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const secretKey = process.env.CROSS_SITE_AUTH_SECRET;
  const keyData = encoder.encode(secretKey);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, data);

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
};
