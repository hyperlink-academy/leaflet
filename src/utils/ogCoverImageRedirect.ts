// 302 to the cached /api/atproto_images proxy for a post's cover image, used
// by the post opengraph-image routes. width=1200 requests a variant sized for
// unfurl cards instead of the full-resolution blob. Absolute URL because some
// unfurl bots mishandle a relative Location.
export function coverImageRedirect(did: string, cid: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leaflet.pub";
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${baseUrl.replace(/\/$/, "")}/api/atproto_images?did=${did}&cid=${cid}&width=1200&v=1`,
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "CDN-Cache-Control":
        "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
