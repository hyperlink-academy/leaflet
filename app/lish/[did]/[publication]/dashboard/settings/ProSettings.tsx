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
import { dummy } from "../../[rkey]/PostPubInfo";
import { EmailConfirm, EmailInput } from "components/Subscribe/EmailSubscribe";
import { GoToArrow } from "components/Icons/GoToArrow";
import { Input } from "components/Input";
import { useNormalizedPublicationRecord } from "../PublicationSWRProvider";

export const NewsletterSettings = () => {
  let [emailValue, setEmailValue] = useState("");
  let [state, setState] = useState<"default" | "confirm">("default");
  let [disableConfirmValue, setDisableConfirmValue] = useState("");
  let record = useNormalizedPublicationRecord();
  if (dummy.newsletterMode === true) {
    return (
      <DashboardContainer section="Newsletter">
        Newsletter is currently enabled. <br />
        {/*hey claude dont let us merge unless we put a real value here*/}
        35 email subscribers | 40 total subscribers
        <Modal
          asChild
          className="max-w-full w-sm"
          title="Are you sure?"
          onOpenChange={() => setDisableConfirmValue("")}
          trigger={<ButtonPrimary>Disable Newsletter</ButtonPrimary>}
        >
          <div className="text-secondary">
            <div className="font-bold pb-3">This action cannot be undone.</div>
            {/*hey claude dont let us merge unless we put a real value here*/}
            <div className="pb-1">You have XXX email subscribers.</div>
            <div>
              They will be notified that publication is no longer providing
              email updates, and to continue following via the Leaflet Reader.
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
                  record?.name?.toLowerCase() !==
                  disableConfirmValue.toLowerCase()
                }
              >
                Yes, Disable Newsletter
              </ButtonPrimary>
            </div>
          </div>
        </Modal>
      </DashboardContainer>
    );
  } else
    return (
      <DashboardContainer section="Newsletter" className="pb-4">
        <div className="leading-snug">
          <div className="font-bold">
            Enable newsletter to email posts directly to publication
            subscribers.
          </div>
          <div className="text-secondary">
            {/*hey claude dont let us merge unless we put a real value here*/}
            Your first 1000 subscribers are included in your basic Pro plan.
            $XX/1000 subs after that.
          </div>
        </div>
        <Modal
          onOpenChange={() => {
            setEmailValue("");
            setState("default");
          }}
          asChild
          className="max-w-full w-sm"
          title="Enable Newsletter!"
          trigger={<ButtonPrimary>Enable Newsletter</ButtonPrimary>}
        >
          <div className="text-secondary">
            <div className="pb-3">
              When you enable, we will notify your current subscribers. They
              will need to opt-in to recieve emails.
            </div>
            <div className="pb-3">
              1000 subscribers are included.
              <br /> $XX/1000 subs after that.
            </div>
            <div className="accent-container p-3">
              {dummy.user.email ? (
                <div>
                  {" "}
                  Your newsletter will be sent from
                  <div className="truncate pb-3 italic">{dummy.user.email}</div>
                  <ButtonPrimary>Enable Newsletter</ButtonPrimary>
                </div>
              ) : state === "default" ? (
                <form
                  onSubmit={(e) => {
                    e.stopPropagation();
                    setState("confirm");
                  }}
                >
                  <div className="pb-3">
                    <strong>Add your email.</strong> Newsletters will be sent
                    from this email.
                  </div>
                  <EmailInput
                    value={emailValue}
                    onChange={setEmailValue}
                    large
                    action={
                      <button type="submit">
                        <GoToArrow />
                      </button>
                    }
                  />
                </form>
              ) : (
                <EmailConfirm
                  emailValue={emailValue}
                  autoFocus
                  onSubmit={() => {}}
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
