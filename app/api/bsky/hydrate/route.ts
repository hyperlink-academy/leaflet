import { Agent, lexToJson } from "@atproto/api";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const urisParam = searchParams.get("uris");

    if (!urisParam) {
      return Response.json(
        { error: "uris parameter is required" },
        { status: 400 },
      );
    }

    // Parse URIs from JSON string
    let uris: string[];
    try {
      uris = JSON.parse(urisParam);
    } catch (e) {
      return Response.json(
        { error: "uris must be valid JSON array" },
        { status: 400 },
      );
    }

    if (!Array.isArray(uris)) {
      return Response.json({ error: "uris must be an array" }, { status: 400 });
    }

    if (uris.length === 0) {
      return Response.json([], {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
        },
      });
    }

    // Hydrate Bluesky URIs with post data
    let agent = new Agent({
      service: "https://public.api.bsky.app",
    });

    // Process URIs in batches of 25
    let allPostRequests = [];
    for (let i = 0; i < uris.length; i += 25) {
      let batch = uris.slice(i, i + 25);
      let batchPosts = agent.getPosts(
        {
          uris: batch,
        },
        { headers: {} },
      );
      allPostRequests.push(batchPosts);
    }
    let allPosts = (await Promise.all(allPostRequests)).flatMap(
      (r) => r.data.posts,
    );

    const posts = lexToJson(allPosts) as PostView[];

    return Response.json(posts, {
      headers: {
        // Cache for 1 hour on CDN, allow stale content for 24 hours while revalidating
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error hydrating Bluesky posts:", error);
    return Response.json({ error: "Failed to hydrate posts" }, { status: 500 });
  }
}
