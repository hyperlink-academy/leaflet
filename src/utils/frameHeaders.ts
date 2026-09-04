// Whether a response's headers permit embedding it in an iframe on our
// origin. Per spec, a CSP frame-ancestors directive supersedes
// X-Frame-Options, so it's consulted first. We only credit sources that
// clearly include us (*, any-https, or a leaflet.pub ancestor) — host lists
// naming other sites, 'self', and 'none' all count as blocked.
export function headersAllowFraming(
  xFrameOptions: string | null,
  contentSecurityPolicy: string | null,
): boolean {
  let frameAncestors = contentSecurityPolicy
    ?.split(";")
    .map((directive) => directive.trim().toLowerCase())
    .find((directive) => directive.startsWith("frame-ancestors"));
  if (frameAncestors) {
    let sources = frameAncestors.split(/\s+/).slice(1);
    return sources.some(
      (source) =>
        source === "*" ||
        source === "https:" ||
        source === "'https:'" ||
        source.includes("leaflet.pub"),
    );
  }
  return !xFrameOptions;
}
