import { lexToJson } from "@atproto/api";
import { NextRequest } from "next/server";
import { getAgent } from "../agent";

export const runtime = "nodejs";

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

    const agent = await getAgent();

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
