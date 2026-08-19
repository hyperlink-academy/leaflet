"use client";
import { refreshIdentityData } from "components/IdentityProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { CheckTiny } from "components/Icons/CheckTiny";
import { GoToArrow } from "components/Icons/GoToArrow";
import { Modal, useModalBack } from "components/Modal";
import { Toggle } from "components/Toggle";
import { useToaster } from "components/Toast";
import { DotLoader } from "components/utils/DotLoader";
import {
  ChangePlanForm,
  MembershipActions,
  membershipPrice,
} from "components/Memberships/ChangePlanModal";
import { CancelMembershipForm } from "components/Memberships/CancelMembershipModal";
import { ResumeMembershipForm } from "components/Memberships/ResumeMembershipModal";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import {
  useMyMembership,
  mutateMyMembership,
} from "components/Memberships/useMyMembership";
import { LinkHandle } from "./HandleSubscribe";
import { EmailInput, EmailConfirm } from "./EmailSubscribe";
import type { ViewerUser } from "./viewerSubscription";
import { type MyMembership } from "actions/memberships";
import type { MembershipTiers, SubscriberTier } from "src/membership";
import {
  requestPublicationEmailSubscription,
  confirmPublicationEmailSubscription,
  unsubscribeFromPublication,
  setEmailNotifications,
} from "actions/publications/subscribeEmail";

const BLUESKY_FEED_URL =
  "https://bsky.app/profile/leaflet.pub/feed/subscribedPublications";

const prefClassName =
  "flex gap-2 justify-between font-bold text-secondary items-center";

function readManageSubscriptionReturn(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (!params.get("manage_subscription")) return false;
  params.delete("manage_subscription");
  const qs = params.toString();
  window.history.replaceState(
    null,
    "",
    window.location.pathname + (qs ? `?${qs}` : ""),
  );
  return true;
}

type ModalContent = {
  type: "change" | "cancel" | "resume";
  membership: MyMembership;
};

export const ManageSubscription = (props: {
  publicationUri: string;
  publicationUrl?: string;
  newsletterMode: boolean;
  user: ViewerUser;
  triggerLabel?: string;
  membershipTiers?: MembershipTiers;
  onChangeMembership?: () => void;
}) => {
  let [open, setOpen] = useState(false);
  let [modalState, setModalState] = useState<ModalContent | null>(null);

  useEffect(() => {
    if (readManageSubscriptionReturn()) setOpen(true);
  }, []);

  const onMembershipChanged = () => {
    setModalState(null);
    setOpen(false);
    mutateMyMembership(props.publicationUri);
  };
  const onFreeMembershipChange = () => {
    setOpen(false);
    props.onChangeMembership?.();
  };
  return (
    <Modal
      asChild
      open={open}
      title={
        <div className="relative mx-auto text-center">
          {modalState?.type === "change"
            ? "Change Membership"
            : modalState?.type === "resume"
              ? "Resume Membership?"
              : modalState?.type === "cancel"
                ? modalState.membership.cancelAtPeriodEnd
                  ? "Membership Cancelled"
                  : "Cancel Membership"
                : "Manage Subscription"}
        </div>
      }
      className={
        modalState?.type === "change"
          ? "w-fit max-w-full bg-[var(--color-bg-light)]!"
          : "w-md max-w-full"
      }
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setModalState(null);
      }}
      sheetOnMobile
      trigger={
        <button
          type="button"
          className="manageSubPrefsTrigger flex gap-1 text-accent-contrast text-sm items-center "
        >
          {props.triggerLabel ? (
            <div className="hover:underline">{props.triggerLabel}</div>
          ) : (
            <>
              <div className="font-bold flex gap-1 items-center">
                <CheckTiny /> Subscribed
              </div>
              <div className="underline">Manage</div>
            </>
          )}
        </button>
      }
    >
      <ModalContent
        {...props}
        state={modalState}
        setState={setModalState}
        onSuccess={onMembershipChanged}
        onFreeMembershipChange={onFreeMembershipChange}
      />
    </Modal>
  );
};

const ModalContent = ({
  state,
  setState,
  onSuccess,
  ...content
}: {
  publicationUri: string;
  publicationUrl?: string;
  newsletterMode: boolean;
  user: ViewerUser;
  membershipTiers?: MembershipTiers;
  onChangeMembership?: () => void;
  state: ModalContent | null;
  setState: (state: ModalContent | null) => void;
  onSuccess: () => void;
  onFreeMembershipChange: () => void;
}) => {
  const back = () => setState(null);
  useModalBack(state ? back : null);

  if (!state)
    return (
      <ManageSubscriptionContent
        {...content}
        onChangePlan={(membership) => setState({ type: "change", membership })}
        onResume={(membership) => setState({ type: "resume", membership })}
        onCancel={(membership) => setState({ type: "cancel", membership })}
      />
    );

  if (state.type === "change")
    return (
      <ChangePlanForm membership={state.membership} onSuccess={onSuccess} />
    );

  if (state.type === "resume")
    return (
      <ResumeMembershipForm
        membership={state.membership}
        onSuccess={onSuccess}
        onBack={back}
      />
    );

  return (
    <CancelMembershipForm
      membership={state.membership}
      onSuccess={onSuccess}
      onBack={back}
    />
  );
};

const ManageSubscriptionContent = (props: {
  publicationUri: string;
  publicationUrl?: string;
  newsletterMode: boolean;
  user: ViewerUser;
  membershipTiers?: MembershipTiers;
  onChangeMembership?: () => void;
  onChangePlan: (membership: MyMembership) => void;
  onResume: (membership: MyMembership) => void;
  onCancel: (membership: MyMembership) => void;
  onFreeMembershipChange: () => void;
}) => {
  const { user } = props;
  const { membership, isLoading } = useMyMembership(props.publicationUri);
  let [email, setEmail] = useState(user.email ?? "");
  let [linkEmailOpen, setLinkEmailOpen] = useState(false);
  let [linkRequesting, setLinkRequesting] = useState(false);
  let [linkConfirming, setLinkConfirming] = useState(false);
  let [unsubscribing, setUnsubscribing] = useState(false);
  let [emailOverride, setEmailOverride] = useState<boolean | null>(null);
  let toaster = useToaster();
  let router = useRouter();

  const notify = (type: "success" | "error", message: string) =>
    toaster({ type, content: <div className="font-bold">{message}</div> });
  const notifyError = (error: string, fallback: string) =>
    notify("error", ERROR_MESSAGES[error] ?? fallback);
  const refreshSubscription = () => {
    refreshIdentityData();
    router.refresh();
  };

  const emailEnabled = emailOverride ?? user.emailEnabled;
  useEffect(() => {
    setEmailOverride(null);
  }, [user.emailEnabled]);

  const onToggleEmail = async () => {
    if (emailOverride !== null) return;
    const next = !emailEnabled;
    setEmailOverride(next);
    const res = await setEmailNotifications(props.publicationUri, next);
    if (!res.ok) {
      setEmailOverride(null);
      notifyError(
        res.error,
        "We couldn't update your email notifications. Please try again!",
      );
      return;
    }
    refreshSubscription();
  };

  const onRequestLink = async () => {
    if (linkRequesting || !email) return;
    setLinkRequesting(true);
    const res = await requestPublicationEmailSubscription(
      props.publicationUri,
      email,
    );
    setLinkRequesting(false);
    if (!res.ok) {
      notifyError(res.error, "We couldn't link that email. Please try again!");
      return;
    }
    if (res.value.confirmed) {
      notify("success", "Email Linked!");
      setLinkEmailOpen(false);
      refreshSubscription();
      return;
    }
    setLinkEmailOpen(true);
  };

  const onConfirmLink = async (code: string) => {
    if (linkConfirming) return;
    setLinkConfirming(true);
    const res = await confirmPublicationEmailSubscription(
      props.publicationUri,
      email,
      code,
    );
    setLinkConfirming(false);
    if (!res.ok) {
      notifyError(res.error, "We couldn't confirm the code. Please try again!");
      return;
    }
    notify("success", "Email Linked!");
    setLinkEmailOpen(false);
    refreshSubscription();
  };

  const onUnsubscribe = async () => {
    if (unsubscribing) return;
    setUnsubscribing(true);
    const res = await unsubscribeFromPublication(props.publicationUri);
    setUnsubscribing(false);
    if (!res.ok) {
      notifyError(res.error, "We couldn't unsubscribe you. Please try again!");
      return;
    }
    notify("success", "Unsubscribed!");
    mutateMyMembership(props.publicationUri);
    refreshSubscription();
  };

  if (isLoading)
    return (
      <div className="flex justify-center py-8">
        <DotLoader />
      </div>
    );

  const resolvedMembership = user.membership;
  const activeMembership =
    membership && resolvedMembership?.kind === "paid" ? membership : null;

  const pendingCancellation = activeMembership?.cancelAtPeriodEnd
    ? activeMembership
    : null;
  const freeMembership =
    !activeMembership && resolvedMembership?.kind === "free"
      ? props.membershipTiers?.subscriber
      : null;

  const canMuteEmail =
    !emailEnabled || user.atprotoSubscribed || !!activeMembership;

  return (
    <div className="manageSubPrefs flex flex-col gap-2">
      {activeMembership ? (
        <MembershipSection
          membership={activeMembership}
          onChangePlan={props.onChangePlan}
          onResume={props.onResume}
        />
      ) : freeMembership ? (
        <FreeMembershipSection
          tier={freeMembership}
          onChangePlan={
            props.onChangeMembership ? props.onFreeMembershipChange : undefined
          }
        />
      ) : null}
      {props.newsletterMode && user.email ? (
        <div className={prefClassName}>
          <div className="flex flex-col leading-snug">
            <p>Email Notifications</p>
            <p className="text-tertiary font-normal italic">{user.email}</p>
          </div>
          {canMuteEmail ? (
            <Toggle toggle={emailEnabled} onToggle={onToggleEmail}>
              <span className="sr-only">
                {emailEnabled
                  ? "Turn off email notifications"
                  : "Turn on email notifications"}
              </span>
            </Toggle>
          ) : null}
        </div>
      ) : null}
      {user.handle && (
        <div className={prefClassName}>
          <div className="flex flex-col leading-snug">
            Linked Handle
            <p className="text-tertiary font-normal italic">{user.handle}</p>
          </div>
        </div>
      )}
      {props.publicationUrl && (
        <a
          href={`${props.publicationUrl}/rss`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${prefClassName} no-underline hover:text-accent-contrast`}
        >
          RSS Feed <GoToArrow className="text-accent-contrast" />
        </a>
      )}
      <a
        href={BLUESKY_FEED_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`${prefClassName} no-underline hover:text-accent-contrast`}
      >
        Bluesky Feed
        <GoToArrow className="text-accent-contrast" />
      </a>

      {props.newsletterMode && !user.email ? (
        <div className="linkEmail accent-container p-4 text-sm flex flex-col gap-3 text-center justify-center">
          <div className={`text-secondary flex flex-col text-sm leading-snug`}>
            <h4 className={"text-sm"}>Link your email</h4>
            <div className="text-tertiary">
              to get updates right to your inbox!
            </div>
          </div>
          <EmailInput
            value={email}
            onChange={setEmail}
            loading={linkRequesting}
            onSubmit={onRequestLink}
            action={
              <Modal
                open={linkEmailOpen}
                onOpenChange={setLinkEmailOpen}
                trigger={
                  <ButtonPrimary
                    type="button"
                    compact
                    disabled={linkRequesting || !email}
                    onClick={onRequestLink}
                    className="leading-tight! outline-none! text-sm!"
                  >
                    link
                  </ButtonPrimary>
                }
              >
                <EmailConfirm
                  emailValue={email}
                  autoFocus
                  loading={linkConfirming}
                  onBack={() => setLinkEmailOpen(false)}
                  onSubmit={onConfirmLink}
                />
              </Modal>
            }
          />
        </div>
      ) : null}
      {!user.handle ? (
        <div className="accent-container p-4 text-sm">
          <LinkHandle compact />
        </div>
      ) : null}

      <hr className="border-border-light my-2" />
      {activeMembership && !pendingCancellation ? (
        <ButtonSecondary
          fullWidth
          onClick={() => props.onCancel(activeMembership)}
        >
          Cancel Membership
        </ButtonSecondary>
      ) : (
        <ButtonSecondary
          fullWidth
          disabled={unsubscribing}
          onClick={() =>
            pendingCancellation
              ? props.onCancel(pendingCancellation)
              : onUnsubscribe()
          }
        >
          {unsubscribing ? "Unsubscribing…" : "Unsubscribe"}
        </ButtonSecondary>
      )}
    </div>
  );
};

const FreeMembershipSection = (props: {
  tier: SubscriberTier;
  onChangePlan?: () => void;
}) => (
  <div className={prefClassName}>
    <div className="flex flex-col leading-snug">
      <p>Membership</p>
      <p className="text-tertiary font-normal italic">{props.tier.name}</p>
    </div>
    {props.onChangePlan && (
      <ButtonPrimary
        className="text-sm"
        type="button"
        compact
        onClick={props.onChangePlan}
      >
        Change
      </ButtonPrimary>
    )}
  </div>
);

const MembershipSection = (props: {
  membership: MyMembership;
  onChangePlan: (membership: MyMembership) => void;
  onResume: (membership: MyMembership) => void;
}) => {
  const { membership } = props;
  const price = membershipPrice(membership);
  const endDate = useLocalizedDate(membership.currentPeriodEnd ?? "", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return (
    <div className={prefClassName}>
      <div className="flex flex-col leading-snug w-full">
        <div className=" flex justify-between gap-4 w-full">
          <p>Membership</p>
          <MembershipActions
            membership={membership}
            onChangePlan={() => props.onChangePlan(membership)}
            onResume={() => props.onResume(membership)}
          />
        </div>
        <p className="text-tertiary font-normal italic">
          {membership.tierName ?? "Membership"}
          {price ? ` · ${price}` : ""}
        </p>
        <p className="text-tertiary text-sm font-normal italic">
          {membership.cancelAtPeriodEnd && membership.currentPeriodEnd
            ? `Ends ${endDate}`
            : ""}
        </p>
      </div>
    </div>
  );
};

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Sign in to manage your subscription.",
  database_error: "Something went wrong. Please try again.",
  invalid_email: "Please enter a valid email address.",
  no_email: "Link an email to your account first.",
  newsletter_disabled: "This publication isn't accepting email subscriptions.",
  email_send_failed:
    "We couldn't send the confirmation email. Please try again.",
  subscriber_not_found: "No pending subscription. Please try again.",
  invalid_code: "That code didn't match. Please try again.",
  suppressed_spam_complaint:
    "This address was previously marked as spam. Contact the publication to resolve.",
  suppression_delete_failed:
    "We couldn't clear a prior delivery issue on this address. Try again later.",
  membership_active: "Cancel your membership first, then unsubscribe.",
  membership_pending_cancellation:
    "Your membership is still active — confirm cancelling it to unsubscribe.",
  stripe_error:
    "We couldn't cancel your membership's billing. Please try again.",
};
