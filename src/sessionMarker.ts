// Non-httpOnly companion to auth_token/external_auth_token. The auth cookies
// are httpOnly, so client code on cacheable published pages can't tell whether
// a session exists; this marker lets them skip the identity fetch entirely for
// anonymous readers (and bots). It carries no secret — presence only.
export const SESSION_MARKER_COOKIE = "leaflet_session";

export function hasSessionMarker() {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((c) => c.startsWith(`${SESSION_MARKER_COOKIE}=`));
}
