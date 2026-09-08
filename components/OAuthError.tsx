"use client";

import { OAuthSessionError } from "src/atproto-oauth";
import { useIdentityData } from "components/IdentityProvider";
import { buildOauthLoginUrl } from "src/utils/customDomain";

export function OAuthErrorMessage({
  error,
  className,
}: {
  error: OAuthSessionError;
  className?: string;
}) {
  let { identity } = useIdentityData();
  // reauth=true forces the PDS round-trip: the atproto session expired even
  // though the leaflet auth_token is still valid, so the session-check skip must
  // not short-circuit it.
  let signInUrl = buildOauthLoginUrl({
    reauth: true,
    redirect: window.location.href,
    handle: error.did || undefined,
  });
  let isOtherUser =
    !!error.did && !!identity?.atp_did && error.did !== identity.atp_did;

  if (isOtherUser) {
    return (
      <div className={`${className} leading-snug`}>
        The publication owner's session has expired. Ask them to sign in again
        before publishing.
      </div>
    );
  }

  return (
    <div className={`${className} leading-snug`}>
      <span>You're logged out! </span>
      <a href={signInUrl} className="underline font-bold whitespace-nowrap">
        Sign in
      </a>
    </div>
  );
}

// Toast body for a failed action: the sign-in prompt when the atproto session
// has expired, otherwise the caller's generic message.
export function actionErrorContent(error: unknown, fallback: string) {
  return isOAuthSessionError(error) ? (
    <OAuthErrorMessage error={error} />
  ) : (
    fallback
  );
}

export function isOAuthSessionError(
  error: unknown,
): error is OAuthSessionError {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    (error as OAuthSessionError).type === "oauth_session_expired"
  );
}
