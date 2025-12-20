import { lexToJson } from "@atproto/api";
import { NextRequest } from "next/server";
import { getAgent } from "../agent";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const uri = searchParams.get("uri");
    const depth = searchParams.get("depth");
    const parentHeight = searchParams.get("parentHeight");

    if (!uri) {
      return Response.json(
        { error: "uri parameter is required" },
        { status: 400 },
      );
    }

    const agent = await getAgent();

    const response = await agent.getPostThread({
      uri,
      depth: depth ? parseInt(depth, 10) : 6,
      parentHeight: parentHeight ? parseInt(parentHeight, 10) : 80,
    });

    const thread = lexToJson(response.data.thread);

    return Response.json(thread, {
      headers: {
        // Cache for 5 minutes on CDN, allow stale content for 1 hour while revalidating
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Error fetching Bluesky thread:", error);
    return Response.json({ error: "Failed to fetch thread" }, { status: 500 });
  }
}
