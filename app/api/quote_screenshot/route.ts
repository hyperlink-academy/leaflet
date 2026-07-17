export const maxDuration = 60;
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { screenshotBskyCardImage } from "src/utils/bskyCardScreenshot";

// Renders the bsky external-card thumbnail (1200x630 webp) for a url. The
// share modal fetches this the moment it opens so the slow browser render is
// (hopefully) done by the time the user finishes composing their post.
export async function GET(req: NextRequest) {
  let url = req.nextUrl.searchParams.get("url");
  let parsed;
  try {
    parsed = new URL(url || "");
  } catch {
    return new Response("Invalid url", { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
    return new Response("Invalid url", { status: 400 });

  let image = await screenshotBskyCardImage(parsed.toString());
  if (!image) return new Response("Screenshot failed", { status: 502 });
  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/webp",
      // Edge-cache per url so repeat share-modal opens don't each pay a
      // multi-second browser render.
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
