"use client";
import { confirmEmailLogin } from "actions/emailAuth";
import { EmailConfirm } from "components/Subscribe/EmailSubscribe";
import { useToaster } from "components/Toast";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginConfirmForm() {
  let params = useSearchParams();
  let toaster = useToaster();
  let token = params.get("token");
  let email = params.get("email") ?? "";
  // Absolute by contract (the email-login route always sets it); the origin
  // fallback is applied in the handlers below — where window is defined — so
  // confirmEmailLogin never hands postAuthRedirect a relative URL.
  let redirectParam = params.get("redirect");
  let [loading, setLoading] = useState(false);

  let onSubmit = async (code: string) => {
    if (!token) return;
    setLoading(true);
    let redirect = redirectParam || window.location.origin;
    let res = await confirmEmailLogin(token, code, redirect);
    if (!res.ok) {
      setLoading(false);
      toaster({
        content: <div className="font-bold">Incorrect code!</div>,
        type: "error",
      });
      return;
    }
    window.location.href = res.url;
  };

  return (
    <EmailConfirm
      autoFocus
      emailValue={email}
      loading={loading}
      onSubmit={onSubmit}
      onBack={() => {
        window.location.href = redirectParam || window.location.origin;
      }}
    />
  );
}
