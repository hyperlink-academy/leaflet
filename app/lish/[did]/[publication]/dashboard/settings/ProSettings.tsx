import { useEffect, useMemo, useState } from "react";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { createBillingPortalSession } from "actions/createBillingPortalSession";
import { useIdentityData } from "components/IdentityProvider";
import { DotLoader } from "components/utils/DotLoader";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { PRODUCT_DEFINITION } from "stripe/products";
import { DashboardContainer } from "./SettingsContent";
import { Modal } from "components/Modal";
import { EmailConfirm } from "components/Subscribe/EmailSubscribe";
import { Input } from "components/Input";
import {
  useNormalizedPublicationRecord,
  usePublicationData,
} from "../PublicationSWRProvider";
import { useToaster } from "components/Toast";
import {
  clearReplyToEmail,
  confirmReplyToVerification,
  disableNewsletter,
  enableNewsletter,
  setReplyToEmail,
} from "actions/publications/newsletterSettings";
import {
  NO_REPLY_EMAIL,
  buildFromAddress,
  resolveFromDomain,
} from "src/utils/newsletterSender";

export const NewsletterSettings = () => {
  let { data, mutate } = usePublicationData();
  let record = useNormalizedPublicationRecord();
  let toaster = useToaster();

  let publicationUri = data?.publication?.uri;
  let settings = data?.publication?.publication_newsletter_settings;
  let newsletterMode = settings?.enabled ?? false;
  let pubDomains = data?.publication?.publication_domains ?? [];

  let fromAddress = useMemo(() => {
    let domain = resolveFromDomain(record?.url, pubDomains[0]?.domain);
    return domain ? buildFromAddress(domain) : null;
  }, [record?.url, pubDomains]);

  let fromName = record?.name || "";
  let savedReplyTo = settings?.reply_to_email ?? "";
  let pendingVerification =
    !!settings?.reply_to_email && !settings?.reply_to_verified_at;

  let [enabling, setEnabling] = useState(false);
  let [disabling, setDisabling] = useState(false);
  let [replyToValue, setReplyToValue] = useState(savedReplyTo);
  let [savingReplyTo, setSavingReplyTo] = useState(false);
  let [confirming, setConfirming] = useState(false);
  let [verifyOpen, setVerifyOpen] = useState(false);

  useEffect(() => {
    setReplyToValue(savedReplyTo);
  }, [savedReplyTo]);
  useEffect(() => {
    setVerifyOpen(pendingVerification);
  }, [pendingVerification]);

  if (!publicationUri) return null;

  if (!newsletterMode) {
    return (
      <DashboardContainer section="Newsletter" className="pb-4">
        <div className="leading-snug text-secondary">
          Email posts directly to publication subscribers when you publish.
        </div>
        <ButtonPrimary
          className="self-start"
          disabled={enabling}
          onClick={async () => {
            if (!publicationUri || enabling) return;
            setEnabling(true);
            let res = await enableNewsletter(publicationUri);
            setEnabling(false);
            if (!res.ok) {
              toaster({
                type: "error",
                content: "Failed to enable newsletter.",
              });
              return;
            }
            toaster({ type: "success", content: "Newsletter enabled!" });
            await mutate();
          }}
        >
          {enabling ? <DotLoader /> : "Enable Newsletter"}
        </ButtonPrimary>
      </DashboardContainer>
    );
  }

  let replyToDirty =
    replyToValue.trim().toLowerCase() !== savedReplyTo.toLowerCase();

  return (
    <DashboardContainer section="Newsletter" className="pb-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-secondary leading-snug">
            Newsletter mode is enabled. Subscribers receive an email when you
            publish.
          </div>
          <ButtonSecondary
            disabled={disabling}
            onClick={async () => {
              if (!publicationUri || disabling) return;
              setDisabling(true);
              let res = await disableNewsletter(publicationUri);
              setDisabling(false);
              if (!res.ok) {
                toaster({
                  type: "error",
                  content: "Failed to disable newsletter.",
                });
                return;
              }
              toaster({ type: "success", content: "Newsletter disabled." });
              await mutate();
            }}
          >
            {disabling ? <DotLoader /> : "Disable"}
          </ButtonSecondary>
        </div>

        <hr className="border-border-light" />

        <div className="flex flex-col gap-1">
          <p className="text-secondary font-bold">From Name</p>
          <div className="input-with-border w-full max-w-prose text-tertiary bg-border-light px-2 py-1 rounded-md">
            {fromName || "—"}
          </div>
          <p className="text-tertiary text-sm leading-snug">
            The publication name is used as the sender name.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-secondary font-bold">From Email</p>
          <div className="input-with-border w-full max-w-prose text-tertiary bg-border-light px-2 py-1 rounded-md">
            {fromAddress || "—"}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-secondary font-bold"
            htmlFor="newsletterReplyTo"
          >
            Reply-to Email{" "}
            <span className="font-normal text-tertiary">(optional)</span>
          </label>
          <p className="text-tertiary text-sm leading-snug">
            Where subscriber replies are sent. Leave blank to use the no-reply
            address ({NO_REPLY_EMAIL}).
          </p>
          <div className="flex gap-2 items-stretch max-w-prose">
            <Input
              id="newsletterReplyTo"
              className="input-with-border w-full text-primary"
              type="email"
              value={replyToValue}
              placeholder={NO_REPLY_EMAIL}
              onChange={(e) => setReplyToValue(e.currentTarget.value)}
            />
            {replyToDirty ? (
              <ButtonSecondary
                disabled={savingReplyTo}
                onClick={async () => {
                  if (!publicationUri || savingReplyTo) return;
                  let trimmed = replyToValue.trim();
                  setSavingReplyTo(true);
                  if (trimmed === "") {
                    let res = await clearReplyToEmail(publicationUri);
                    setSavingReplyTo(false);
                    if (!res.ok) {
                      toaster({
                        type: "error",
                        content: "Failed to clear reply-to.",
                      });
                      return;
                    }
                    toaster({
                      type: "success",
                      content: "Reply-to cleared. Using no-reply address.",
                    });
                    await mutate();
                    return;
                  }
                  let res = await setReplyToEmail(publicationUri, trimmed);
                  setSavingReplyTo(false);
                  if (!res.ok) {
                    toaster({
                      type: "error",
                      content:
                        res.error === "invalid_email"
                          ? "Please enter a valid email address."
                          : res.error === "email_send_failed"
                            ? "We couldn't send the confirmation email."
                            : "Something went wrong. Try again.",
                    });
                    return;
                  }
                  if (res.value.verification_required) {
                    setVerifyOpen(true);
                    toaster({
                      type: "success",
                      content: "Confirmation code sent.",
                    });
                  } else {
                    toaster({
                      type: "success",
                      content: "Reply-to saved.",
                    });
                  }
                  await mutate();
                }}
              >
                {savingReplyTo ? <DotLoader /> : "Save"}
              </ButtonSecondary>
            ) : pendingVerification ? (
              <ButtonSecondary onClick={() => setVerifyOpen(true)}>
                Verify
              </ButtonSecondary>
            ) : null}
          </div>
          {pendingVerification && !replyToDirty && (
            <p className="text-tertiary text-sm leading-snug">
              Pending verification. Until confirmed, the no-reply address is
              used.
            </p>
          )}
        </div>
      </div>

      <Modal
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        title="Confirm reply-to address"
        className="max-w-full w-sm"
      >
        <EmailConfirm
          emailValue={settings?.reply_to_email ?? ""}
          autoFocus
          loading={confirming}
          onSubmit={async (code) => {
            if (!publicationUri || confirming) return;
            setConfirming(true);
            let res = await confirmReplyToVerification(publicationUri, code);
            setConfirming(false);
            if (!res.ok) {
              toaster({
                type: "error",
                content:
                  res.error === "invalid_code"
                    ? "That code didn't match. Try again."
                    : res.error === "no_pending_verification"
                      ? "No pending verification."
                      : "Something went wrong. Try again.",
              });
              return;
            }
            toaster({ type: "success", content: "Reply-to verified." });
            setVerifyOpen(false);
            await mutate();
          }}
          onBack={() => setVerifyOpen(false)}
        />
      </Modal>
    </DashboardContainer>
  );
};

export const ManageProSubscription = (props: { compact?: boolean }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { identity } = useIdentityData();

  const subscription = identity?.subscription;
  const renewalDate = useLocalizedDate(
    subscription?.current_period_end || new Date().toISOString(),
    { month: "long", day: "numeric", year: "numeric" },
  );

  async function handleManageBilling() {
    setLoading(true);
    setError(null);
    const result = await createBillingPortalSession(window.location.href);
    if (result.ok) {
      window.location.href = result.value.url;
    } else {
      setError(result.error);
      setLoading(false);
    }
  }
  if (props.compact) {
    return (
      <div className="text-secondary font-bold flex flex-col gap-1 justify-end">
        <ButtonPrimary
          className=""
          compact
          onClick={handleManageBilling}
          disabled={loading}
        >
          {loading ? <DotLoader /> : "Manage Billing"}
        </ButtonPrimary>
        <div className="text-tertiary text-sm font-normal">
          {subscription?.status === "canceled"
            ? "Your subscription has ended"
            : subscription?.status === "canceling"
              ? `Access until ${renewalDate}`
              : `Renews ${renewalDate}`}
        </div>

        {error && <div className="text-sm text-red-500 mt-2">{error}</div>}
      </div>
    );
  }
  return (
    <div>
      <div className="text-secondary text-center flex flex-col leading-snug justify-center gap-2 py-2">
        <div>
          You are subscribed to
          <br />
          <div className="text-xl font-bold text-primary pb-1">
            {PRODUCT_DEFINITION.name}
          </div>
          <div className="text-tertiary italic text-sm">
            {subscription?.status === "canceled"
              ? "Your subscription has ended"
              : subscription?.status === "canceling"
                ? `Access until ${renewalDate}`
                : `Renews ${renewalDate}`}
          </div>
        </div>
        <ButtonPrimary
          className="mx-auto"
          type="button"
          compact
          onClick={handleManageBilling}
          disabled={loading}
        >
          {loading ? <DotLoader /> : "Manage Billing"}
        </ButtonPrimary>
        {error && <div className="text-sm text-red-500 mt-2">{error}</div>}
      </div>
    </div>
  );
};
