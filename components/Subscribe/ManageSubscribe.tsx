"use client";
import { refreshIdentityData } from "components/IdentityProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { CheckTiny } from "components/Icons/CheckTiny";
import { GoToArrow } from "components/Icons/GoToArrow";
import { Modal } from "components/Modal";
import { Toggle } from "components/Toggle";
import { useToaster } from "components/Toast";
import { DotLoader } from "components/utils/DotLoader";
import {
  SwitchPlanForm,
  CancelMembershipForm,
  MembershipActions,
  membershipPrice,
  isMembershipActive,
} from "components/Memberships/SwitchPlanModal";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import {
  useMyMembership,
  mutateMyMembership,
} from "components/Memberships/useMyMembership";
import { LinkHandle } from "./HandleSubscribe";
import { EmailInput, EmailConfirm } from "./EmailSubscribe";
import type { ViewerUser } from "./viewerSubscription";
import { type MyMembership } from "actions/memberships";
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

// The manage link in newsletter emails lands back on the publication with
// ?manage_subscription=1 (after a pass through email-login) so the panel opens
// without hunting for the button. Several surfaces on one page can mount this
// component; stripping the param claims it, so only the first one opens.
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

export const ManageSubscription = (props: {
  publicationUri: string;
  publicationUrl?: string;
  newsletterMode: boolean;
  user: ViewerUser;
}) => {
  let [open, setOpen] = useState(false);
  let [membershipView, setMembershipView] = useState<{
    type: "switch" | "cancel";
    membership: MyMembership;
  } | null>(null);

  useEffect(() => {
    if (readManageSubscriptionReturn()) setOpen(true);
  }, []);

  const closeMembershipView = () => setMembershipView(null);
  const onMembershipChanged = () => {
    setMembershipView(null);
    mutateMyMembership(props.publicationUri);
  };

  return (
    <Modal
      asChild
      open={open}
      title={
        <div className="relative mb-2">
          {membershipView?.type === "switch"
            ? "Change Plan"
            : membershipView?.type === "cancel"
              ? "Cancel Membership"
              : "Manage Subscription"}
        </div>
      }
      className="w-md max-w-full"
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setMembershipView(null);
      }}
      // A real button rather than a div Radix wraps in one: the wrapper made the
      // row 1.5px taller than the subscribe button it replaces, which is a
      // layout shift when identity resolves on a published page.
      trigger={
        <button
          type="button"
          className="manageSubPrefsTrigger flex gap-1 text-accent-contrast text-sm items-center "
        >
          <div className="font-bold flex gap-1 items-center">
            <CheckTiny /> Subscribed
          </div>
          <div className="underline">Manage</div>
        </button>
      }
    >
      {membershipView?.type === "switch" ? (
        <SwitchPlanForm
          membership={membershipView.membership}
          onSuccess={onMembershipChanged}
          onBack={closeMembershipView}
          onCancel={() =>
            setMembershipView({
              type: "cancel",
              membership: membershipView.membership,
            })
          }
        />
      ) : membershipView?.type === "cancel" ? (
        <CancelMembershipForm
          membership={membershipView.membership}
          onSuccess={onMembershipChanged}
          onBack={() =>
            membershipView.membership.availableTiers.length > 0
              ? setMembershipView({
                  type: "switch",
                  membership: membershipView.membership,
                })
              : closeMembershipView()
          }
        />
      ) : (
        <ManageSubscriptionContent
          {...props}
          onSwitch={(membership) =>
            setMembershipView({ type: "switch", membership })
          }
          onCancel={(membership) =>
            setMembershipView({ type: "cancel", membership })
          }
        />
      )}
    </Modal>
  );
};

// Rendered inside the modal, so the membership fetch only fires when it's
// opened; SWR keeps the result cached across opens and view swaps.
const ManageSubscriptionContent = (props: {
  publicationUri: string;
  publicationUrl?: string;
  newsletterMode: boolean;
  user: ViewerUser;
  onSwitch: (membership: MyMembership) => void;
  onCancel: (membership: MyMembership) => void;
}) => {
  const { user } = props;
  const { membership, isLoading } = useMyMembership(props.publicationUri);
  let [email, setEmail] = useState(user.email ?? "");
  let [linkEmailOpen, setLinkEmailOpen] = useState(false);
  let [linkRequesting, setLinkRequesting] = useState(false);
  let [linkConfirming, setLinkConfirming] = useState(false);
  let [unsubscribing, setUnsubscribing] = useState(false);
  let [confirmForfeit, setConfirmForfeit] = useState(false);
  // Optimistic value, held from the click until the identity refetch lands (or
  // the action fails); non-null also means a toggle is already in flight.
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

  const onUnsubscribe = async (opts?: { cancelPaidImmediately?: boolean }) => {
    if (unsubscribing) return;
    setUnsubscribing(true);
    const res = await unsubscribeFromPublication(props.publicationUri, opts);
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

  const activeMembership =
    membership && isMembershipActive(membership.status) ? membership : null;
  // A membership already winding down: fully unsubscribing now cancels the
  // Stripe subscription immediately, forfeiting the remaining paid time — so it
  // goes through an explicit confirm. One that isn't must be cancelled first.
  const pendingCancellation = activeMembership?.cancelAtPeriodEnd
    ? activeMembership
    : null;
  // Turning email off is only a mute when something else keeps the
  // subscription alive; for an email-only reader it *is* the unsubscribe.
  // deriveSubscriptionState would drop `subscribed`, unmounting this panel
  // mid-interaction with no way back in — so they get the address as a plain
  // row (like Linked Handle below) and the deliberate Unsubscribe button.
  // Turning email back on is always safe.
  const canMuteEmail =
    !emailEnabled || user.atprotoSubscribed || !!activeMembership;

  return (
    <div className="manageSubPrefs flex flex-col gap-2">
      {membership && (
        <MembershipSection membership={membership} onSwitch={props.onSwitch} />
      )}
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
        <>
          <ButtonSecondary
            fullWidth
            onClick={() => props.onCancel(activeMembership)}
          >
            Cancel Membership
          </ButtonSecondary>
          <p className="text-tertiary text-sm text-center leading-snug">
            Cancel your membership first to fully unsubscribe.
          </p>
        </>
      ) : pendingCancellation && confirmForfeit ? (
        <ForfeitConfirm
          membership={pendingCancellation}
          unsubscribing={unsubscribing}
          onBack={() => setConfirmForfeit(false)}
          onConfirm={() => onUnsubscribe({ cancelPaidImmediately: true })}
        />
      ) : (
        <ButtonSecondary
          fullWidth
          disabled={unsubscribing}
          onClick={() =>
            pendingCancellation ? setConfirmForfeit(true) : onUnsubscribe()
          }
        >
          {unsubscribing ? "Unsubscribing…" : "Unsubscribe"}
        </ButtonSecondary>
      )}
    </div>
  );
};

const ForfeitConfirm = (props: {
  membership: MyMembership;
  unsubscribing: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) => {
  const endDate = useLocalizedDate(props.membership.currentPeriodEnd ?? "", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return (
    <div className="flex flex-col gap-2">
      <p className="text-secondary text-sm leading-snug">
        Your membership{" "}
        {props.membership.currentPeriodEnd ? (
          <>
            lasts until <strong>{endDate}</strong>
          </>
        ) : (
          "is still active"
        )}
        . Unsubscribing now cancels it immediately and forfeits the remaining
        time.
      </p>
      <div className="flex gap-2 justify-between">
        <ButtonSecondary type="button" onClick={props.onBack}>
          Back
        </ButtonSecondary>
        <ButtonPrimary
          type="button"
          disabled={props.unsubscribing}
          onClick={props.onConfirm}
        >
          {props.unsubscribing ? <DotLoader /> : "Unsubscribe now"}
        </ButtonPrimary>
      </div>
    </div>
  );
};

const MembershipSection = (props: {
  membership: MyMembership;
  onSwitch: (membership: MyMembership) => void;
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
            onSwitch={() => props.onSwitch(membership)}
            onChanged={() => mutateMyMembership(membership.publication)}
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

// Every error code the panel's actions can return; the per-action fallback
// covers anything not listed.
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
