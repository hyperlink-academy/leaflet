import { MAIN_SITE_URL } from "src/utils/customDomain";
import {
  receive_auth_callback_route,
  encryptCrossSiteToken,
} from "src/crossSiteAuth";

export async function postAuthRedirect(
  finalUrl: string,
  authToken: string | null,
): Promise<string> {
  let target = new URL(finalUrl);
  // Only the canonical origin — where the auth_token cookie was just set
  // first-party — can skip the handoff. Vercel preview deployments count as
  // main-site hosts elsewhere, but their cookies are host-only, so a login
  // completing on production must hand them the session like a custom domain.
  if (target.origin === new URL(MAIN_SITE_URL).origin) return finalUrl;
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
