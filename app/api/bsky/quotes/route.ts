import { Agent, lexToJson } from "@atproto/api";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { createOauthClient } from "src/atproto-oauth";
import { supabaseServerClient } from "supabase/serverClient";

export const runtime = "nodejs";

async function getAuthenticatedAgent(): Promise<Agent | null> {
  try {
    const cookieStore = await cookies();
    const authToken =
      cookieStore.get("auth_token")?.value ||
      cookieStore.get("external_auth_token")?.value;

    if (!authToken || authToken === "null") return null;

    const { data } = await supabaseServerClient
      .from("email_auth_tokens")
      .select("identities(atp_did)")
      .eq("id", authToken)
      .eq("confirmed", true)
      .single();

    const did = data?.identities?.atp_did;
    if (!did) return null;

    const oauthClient = await createOauthClient();
    const session = await oauthClient.restore(did);
    return new Agent(session);
  } catch (error) {
    console.error("Failed to get authenticated agent:", error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const uri = searchParams.get("uri");
    const cursor = searchParams.get("cursor");
    const limit = searchParams.get("limit");

    if (!uri) {
      return Response.json(
        { error: "uri parameter is required" },
        { status: 400 },
      );
    }

    // Try to use authenticated agent if user is logged in, otherwise fall back to public API
    let agent = await getAuthenticatedAgent();
    if (!agent) {
      agent = new Agent({
        service: "https://public.api.bsky.app",
      });
    }

    const response = await agent.app.bsky.feed.getQuotes({
      uri,
      limit: limit ? parseInt(limit, 10) : 50,
      cursor: cursor || undefined,
    });

    const result = lexToJson(response.data);

    return Response.json(result, {
      headers: {
        // Cache for 5 minutes on CDN, allow stale content for 1 hour while revalidating
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Error fetching Bluesky quotes:", error);
    return Response.json({ error: "Failed to fetch quotes" }, { status: 500 });
  }
}
