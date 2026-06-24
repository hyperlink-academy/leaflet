import { isMainSiteHost } from "src/utils/customDomain";

export const receive_auth_callback_route = "/receive_auth_callback";

// The main site signs this and hands it to a custom domain's
// receive_auth_callback, which stores auth_token as the domain's first-party
// external_auth_token cookie and forwards to `redirect`.
export type CROSS_SITE_AUTH_RESPONSE = {
  redirect: string;
  auth_token: string | null;
};

export const signCrossSiteToken = async (input: string) => {
  if (!process.env.CROSS_SITE_AUTH_SECRET)
    throw new Error("Environment variable CROSS_SITE_AUTH_SECRET not set ");
  const encoder = new TextEncoder();
  const keyData = encoder.encode(process.env.CROSS_SITE_AUTH_SECRET);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(input));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
};

// Where to send the browser after authenticating on the main site. A custom
// domain can't read the main site's auth_token cookie, so the session is handed
// over through its first-party receive_auth_callback. Same-site (and relative)
// targets are returned unchanged.
export async function postAuthRedirect(
  finalUrl: string,
  authToken: string | null,
): Promise<string> {
  let target: URL;
  try {
    target = new URL(finalUrl);
  } catch {
    return finalUrl;
  }
  if (isMainSiteHost(target.host)) return finalUrl;

  let payload = btoa(
    JSON.stringify({
      redirect: finalUrl,
      auth_token: authToken,
    } satisfies CROSS_SITE_AUTH_RESPONSE),
  );
  let signature = await signCrossSiteToken(payload);
  return `https://${target.host}${receive_auth_callback_route}?payload=${encodeURIComponent(payload)}&signature=${encodeURIComponent(signature)}`;
}
