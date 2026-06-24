import { supabaseServerClient } from "supabase/serverClient";
import { isMainSiteHost, MAIN_SITE_URL } from "src/utils/customDomain";
import {
  CROSS_SITE_AUTH_RESPONSE,
  receive_auth_callback_route,
  signCrossSiteToken,
} from "src/crossSiteAuth";

async function isRegisteredCustomDomain(host: string): Promise<boolean> {
  // Only a confirmed (DNS-verified) custom domain is a host we actually serve;
  // an unconfirmed row is a claim the publisher hasn't proven control of, so
  // the auth token must never be handed to it.
  let { data } = await supabaseServerClient
    .from("custom_domains")
    .select("domain")
    .eq("domain", host)
    .eq("confirmed", true)
    .maybeSingle();
  return !!data;
}

// Where to send the browser after authenticating on the main site. A custom
// domain can't read the main site's auth_token cookie, so the session is handed
// over through its first-party receive_auth_callback. Same-site targets are
// returned unchanged. `finalUrl` must be absolute (callers guarantee it).
//
// The session token is only ever attached to a host we actually serve as a
// confirmed publication custom domain — never to an arbitrary redirect_url,
// which would otherwise exfiltrate the auth_token to an attacker-controlled
// origin. An unrecognized host falls back to the main site root.
export async function postAuthRedirect(
  finalUrl: string,
  authToken: string | null,
): Promise<string> {
  let target = new URL(finalUrl);
  if (isMainSiteHost(target.host)) return finalUrl;
  if (!(await isRegisteredCustomDomain(target.host))) return MAIN_SITE_URL;

  let payload = btoa(
    JSON.stringify({
      redirect: finalUrl,
      auth_token: authToken,
    } satisfies CROSS_SITE_AUTH_RESPONSE),
  );
  let signature = await signCrossSiteToken(payload);
  return `${target.origin}${receive_auth_callback_route}?payload=${encodeURIComponent(payload)}&signature=${encodeURIComponent(signature)}`;
}
