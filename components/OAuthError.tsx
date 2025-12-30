"use client";

import { OAuthSessionError } from "src/atproto-oauth";
import { usePathname } from "next/navigation";

export function OAuthErrorMessage({
  error,
  className,
}: {
  error: OAuthSessionError;
  className?: string;
}) {
  const pathname = usePathname();
  const signInUrl = `/api/oauth/login?redirect_url=${encodeURIComponent(pathname)}${error.did ? `&handle=${encodeURIComponent(error.did)}` : ""}`;

  return (
    <div className={className}>
      <span>Your session has expired or is invalid. </span>
      <a href={signInUrl} className="underline font-bold whitespace-nowrap">
        Sign in again
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
