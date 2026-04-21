import { useState } from "react";
import { ButtonPrimary } from "components/Buttons";
import { createBillingPortalSession } from "actions/createBillingPortalSession";
import { useIdentityData } from "components/IdentityProvider";
import { DotLoader } from "components/utils/DotLoader";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { GoBackSmall } from "components/Icons/GoBackSmall";
import { PRODUCT_DEFINITION } from "stripe/products";
import { DashboardContainer } from "./SettingsContent";
import { Modal } from "components/Modal";
import { EmailConfirm, EmailInput } from "components/Subscribe/EmailSubscribe";
import { GoToArrow } from "components/Icons/GoToArrow";
import { Input } from "components/Input";
import {
  useNormalizedPublicationRecord,
  usePublicationData,
} from "../PublicationSWRProvider";
import { useToaster } from "components/Toast";
import {
  confirmReplyToVerification,
  disableNewsletter,
  requestReplyToVerification,
} from "actions/publications/newsletter";

export const NewsletterSettings = () => {
  let { data, mutate } = usePublicationData();
  let record = useNormalizedPublicationRecord();
  let toaster = useToaster();

  let publicationUri = data?.publication?.uri;
  let newsletterMode =
    data?.publication?.publication_newsletter_settings?.enabled ?? false;

  let [enableOpen, setEnableOpen] = useState(false);
  let [disableOpen, setDisableOpen] = useState(false);
  let [emailValue, setEmailValue] = useState("");
  let [state, setState] = useState<"default" | "confirm">("default");
  let [disableConfirmValue, setDisableConfirmValue] = useState("");
  let [requesting, setRequesting] = useState(false);
  let [confirming, setConfirming] = useState(false);
  let [disabling, setDisabling] = useState(false);

  if (!publicationUri) return null;

  if (newsletterMode) {
    return (
      <DashboardContainer section="Newsletter Mode">
        Newsletter mode is currently enabled.
        <Modal
          open={disableOpen}
          onOpenChange={(o) => {
            setDisableOpen(o);
            if (!o) setDisableConfirmValue("");
          }}
          asChild
          className="max-w-full w-sm"
          title="Are you sure?"
          trigger={<ButtonPrimary>Disable Newsletter Mode</ButtonPrimary>}
        >
          <div className="text-secondary">
            <div className="font-bold pb-3">This action cannot be undone.</div>
            <div>
              Subscribers will no longer receive emails when you publish. They
              can keep following via the Leaflet Reader.
            </div>
            <div className="flex flex-col accent-container p-3 mt-3">
              <div className="">
                To disable, enter the name of this publication below.
              </div>
              <Input
                className="input-with-border w-full mt-2 mb-1 text-primary"
                placeholder={record?.name ?? "Publication Name"}
                type="text"
                value={disableConfirmValue}
                onChange={(e) => setDisableConfirmValue(e.currentTarget.value)}
              />
              <ButtonPrimary
                className="mt-2"
                disabled={
                  disabling ||
                  record?.name?.toLowerCase() !==
                    disableConfirmValue.toLowerCase()
                }
                onClick={async () => {
                  if (!publicationUri) return;
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
                  setDisableOpen(false);
                  await mutate();
                }}
              >
                {disabling ? <DotLoader /> : "Yes, Disable Newsletter"}
              </ButtonPrimary>
            </div>
          </div>
        </Modal>
      </DashboardContainer>
    );
  }
  return (
    <DashboardContainer section="Newsletter" className="pb-4">
      <div className="leading-snug">
        <div className="font-bold">
          Enable newsletter to email posts directly to publication subscribers.
        </div>
      </div>
      <Modal
        open={enableOpen}
        onOpenChange={(o) => {
          setEnableOpen(o);
          if (!o) {
            setEmailValue("");
            setState("default");
          }
        }}
        asChild
        className="max-w-full w-sm"
        title="Enable Newsletter!"
        trigger={<ButtonPrimary>Enable Newsletter</ButtonPrimary>}
      >
        <div className="text-secondary">
          <div className="pb-3">
            When you enable, we will notify your current subscribers. They will
            need to opt-in to receive emails.
          </div>
          <div className="accent-container p-3">
            {state === "default" ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!publicationUri || requesting) return;
                  setRequesting(true);
                  let res = await requestReplyToVerification(
                    publicationUri,
                    emailValue,
                  );
                  setRequesting(false);
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
                  setState("confirm");
                }}
              >
                <div className="pb-3">
                  <strong>Reply-to address.</strong> Readers will see this as
                  the sender and can reply here.
                </div>
                <EmailInput
                  value={emailValue}
                  onChange={setEmailValue}
                  large
                  loading={requesting}
                  action={
                    <button type="submit" aria-label="Send confirmation code">
                      <GoToArrow />
                    </button>
                  }
                />
              </form>
            ) : (
              <EmailConfirm
                emailValue={emailValue}
                autoFocus
                loading={confirming}
                onSubmit={async (code) => {
                  if (!publicationUri || confirming) return;
                  setConfirming(true);
                  let res = await confirmReplyToVerification(
                    publicationUri,
                    code,
                  );
                  setConfirming(false);
                  if (!res.ok) {
                    toaster({
                      type: "error",
                      content:
                        res.error === "invalid_code"
                          ? "That code didn't match. Try again."
                          : res.error === "no_pending_verification"
                            ? "No pending verification. Start over."
                            : "Something went wrong. Try again.",
                    });
                    return;
                  }
                  toaster({
                    type: "success",
                    content: "Newsletter enabled!",
                  });
                  setEnableOpen(false);
                  setEmailValue("");
                  setState("default");
                  await mutate();
                }}
                onBack={() => {
                  setState("default");
                }}
              />
            )}
          </div>
        </div>
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
