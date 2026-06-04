"use client";

import { OAuthSessionError } from "src/atproto-oauth";
import { useIdentityData } from "components/IdentityProvider";

export function OAuthErrorMessage({
  error,
  className,
}: {
  error: OAuthSessionError;
  className?: string;
}) {
  let { identity } = useIdentityData();
  let signInUrl = `/api/oauth/login?redirect_url=${encodeURIComponent(window.location.href)}${error.did ? `&handle=${encodeURIComponent(error.did)}` : ""}`;
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
