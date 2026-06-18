// Hosts that serve the main app rather than a single publication's custom
// domain. A publication only owns the root of its hosted domain, so
// per-publication root files (sitemap.xml, robots.txt) are only served when the
// request arrives on a custom domain — never on the main site.
export function isMainSiteHost(hostname: string): boolean {
  return (
    hostname === "leaflet.pub" ||
    hostname.startsWith("localhost") ||
    hostname.startsWith("127.0.0.1") ||
    hostname.endsWith(".vercel.app")
  );
}
