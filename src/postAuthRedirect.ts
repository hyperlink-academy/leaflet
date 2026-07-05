import { isMainSiteHost } from "src/utils/customDomain";
import {
  receive_auth_callback_route,
  encryptCrossSiteToken,
} from "src/crossSiteAuth";

export async function postAuthRedirect(
  finalUrl: string,
  authToken: string | null,
): Promise<string> {
  let target = new URL(finalUrl);
  if (isMainSiteHost(target.host)) return finalUrl;
  // A dev server can't hand a session to a custom domain (it doesn't share
  // CROSS_SITE_AUTH_SECRET with production, which serves the callback), so
  // send the browser there without one rather than 401 it.
  if (process.env.NODE_ENV === "development") return finalUrl;

  let token = await encryptCrossSiteToken({
    redirect: finalUrl,
    auth_token: authToken,
  });
  return `${target.origin}${receive_auth_callback_route}?token=${encodeURIComponent(token)}`;
}
