export const maxDuration = 60;
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getOrRenderEmailImage } from "src/emailRender/render";

// A canvas image in a post email. Sends only reference images they rendered
// and stored, so this serves the stored PNG, re-rendering it only if storage
// lost it.
export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ key: string }> },
) {
  let key = (await props.params).key.replace(/\.png$/, "");
  if (!/^[0-9a-f]{64}$/.test(key))
    return new Response("Not found", { status: 404 });

  let image = await getOrRenderEmailImage(key);
  if (!image)
    return new Response("Render failed", {
      status: 404,
      headers: {
        "Cache-Control": "public, max-age=60",
        "CDN-Cache-Control": "s-maxage=60",
      },
    });
  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/png",
      // A key is a hash of everything the image is drawn from.
      "Cache-Control": "public, max-age=31536000, immutable",
      // Vercel's edge ignores max-age; without this every open of every
      // email is a function invocation and a storage download.
      "CDN-Cache-Control": "s-maxage=31536000, immutable",
    },
  });
}
