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

export const MAIN_SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://leaflet.pub";

// Base URL for auth endpoints that must run on the main site, where the
// canonical auth_token cookie lives. Returns "" on the main site (use a relative
// path) and the absolute main-site origin from a custom domain, so oauth/email
// login always completes first-party there and hands the session back via the
// custom domain's receive_auth_callback. Pass the Host header server-side; falls
// back to window on the client.
export function mainSiteAuthBase(hostname?: string): string {
  let host =
    hostname ?? (typeof window !== "undefined" ? window.location.hostname : "");
  if (!host || isMainSiteHost(host)) return "";
  return MAIN_SITE_URL;
}

// Single assembly point for the main-site oauth login URL. Encodes every param
// through URLSearchParams so call sites can't drift on ad-hoc escaping. `action`
// is the already-encoded value from encodeActionToSearchParam. Pass the Host
// header server-side; falls back to window on the client (see mainSiteAuthBase).
export function buildOauthLoginUrl(
  params: {
    handle?: string;
    redirect?: string;
    action?: string;
    link?: boolean;
    signup?: boolean;
    autoMerge?: boolean;
    reauth?: boolean;
    addAccount?: boolean;
  },
  hostname?: string,
): string {
  let q = new URLSearchParams();
  if (params.handle) q.set("handle", params.handle);
  if (params.redirect) q.set("redirect_url", params.redirect);
  if (params.action) q.set("action", params.action);
  if (params.link) q.set("link", "true");
  if (params.signup) q.set("signup", "true");
  if (params.autoMerge) q.set("autoMerge", "true");
  if (params.reauth) q.set("reauth", "true");
  if (params.addAccount) q.set("addAccount", "true");
  return `${mainSiteAuthBase(hostname)}/api/oauth/login?${q}`;
}
