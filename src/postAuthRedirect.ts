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

  let token = await encryptCrossSiteToken({
    redirect: finalUrl,
    auth_token: authToken,
  });
  return `${target.origin}${receive_auth_callback_route}?token=${encodeURIComponent(token)}`;
}
