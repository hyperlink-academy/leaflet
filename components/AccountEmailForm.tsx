"use client";
import { useState } from "react";
import {
  refreshIdentityData,
  useIdentityData,
} from "components/IdentityProvider";
import { InputSetting } from "components/SettingsLayout";
import { Input } from "components/Input";
import { ButtonPrimary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import { EmailConfirm } from "components/Subscribe/EmailSubscribe";
import {
  confirmAccountEmailChange,
  requestAccountEmailChange,
  type AccountEmailChangeError,
} from "actions/emailAuth";

const ERROR_MESSAGES: Record<AccountEmailChangeError, string> = {
  unauthorized: "You need to be logged in to do that.",
  invalid_email: "That doesn't look like a valid email.",
  same_email: "That's already the email on your account.",
  invalid_code: "Incorrect code!",
  email_belongs_to_other_account:
    "That email is already linked to another Leaflet account.",
  database_error: "Something went wrong. Please try again.",
};

export function AccountEmailForm(props: { helpText?: React.ReactNode }) {
  let { identity } = useIdentityData();
  let toaster = useToaster();
  let currentEmail = identity?.email ?? null;
  let [email, setEmail] = useState("");
  let [loading, setLoading] = useState(false);
  let [pending, setPending] = useState<{
    tokenId: string;
    email: string;
  } | null>(null);

  let showError = (error: AccountEmailChangeError) =>
    toaster({
      content: <div className="font-bold">{ERROR_MESSAGES[error]}</div>,
      type: "error",
    });

  let requestChange = async () => {
    if (loading || !email) return;
    setLoading(true);
    try {
      let res = await requestAccountEmailChange(email);
      if (!res.ok) return showError(res.error);
      setPending({ tokenId: res.value.tokenId, email: email.trim() });
    } catch {
      toaster({
        content: (
          <div className="font-bold">
            We couldn't send the email. Please try again!
          </div>
        ),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  let confirmChange = async (code: string) => {
    if (!pending || loading) return;
    setLoading(true);
    let res = await confirmAccountEmailChange(pending.tokenId, code);
    setLoading(false);
    if (!res.ok) return showError(res.error);
    setPending(null);
    setEmail("");
    refreshIdentityData();
    toaster({
      content: (
        <div className="font-bold">Your email is now {res.value.email}</div>
      ),
      type: "success",
    });
  };

  if (pending)
    return (
      <div className="flex justify-center">
        <EmailConfirm
          autoFocus
          emailValue={pending.email}
          loading={loading}
          onSubmit={confirmChange}
          onBack={() => setPending(null)}
        />
      </div>
    );

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        requestChange();
      }}
    >
      <InputSetting
        label="Email"
        htmlFor="account-email"
        helpText={
          props.helpText ??
          (currentEmail
            ? "We'll send a code to the new address to confirm it."
            : "Add an email to subscribe to newsletters and receive notifications.")
        }
      >
        <Input
          id="account-email"
          type="email"
          className="input-with-border w-full text-primary"
          placeholder={currentEmail ?? "email@example.com"}
          value={email}
          disabled={loading}
          onChange={(e) => setEmail(e.target.value)}
        />
      </InputSetting>
      <div className="flex justify-end">
        <ButtonPrimary type="submit" disabled={!email || loading}>
          {loading ? (
            <DotLoader />
          ) : currentEmail ? (
            "Change Email"
          ) : (
            "Add Email"
          )}
        </ButtonPrimary>
      </div>
    </form>
  );
}
