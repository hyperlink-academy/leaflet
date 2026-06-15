"use client";

import { LoginContent } from "components/LoginButton";

export function ProCheckoutLogin({ redirectRoute }: { redirectRoute: string }) {
  return (
    <LoginContent
      pageView
      redirectRoute={redirectRoute}
      onSuccess={() => {
        window.location.href = redirectRoute;
      }}
    />
  );
}
