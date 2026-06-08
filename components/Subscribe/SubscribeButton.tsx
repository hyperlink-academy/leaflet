"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SubscribeWithHandle, AtSubscribeSuccess } from "./HandleSubscribe";
import { EmailInput, EmailButton, EmailConfirm } from "./EmailSubscribe";
import { EmailSubscribeSuccess } from "./EmailSubscribeSuccess";
import { LinkIdentityModal } from "./LinkIdentityModal";
import {
  SUBSCRIBE_ERROR_MESSAGES as ERROR_MESSAGES,
  type SubscribeError,
} from "./subscribeErrors";
import { Modal } from "components/Modal";
import { Popover } from "components/Popover";
import { ButtonPrimary } from "components/Buttons";
import { ManageSubscription } from "./ManageSubscribe";
import { useToaster } from "components/Toast";
import { useIdentityData } from "components/IdentityProvider";
import { AtmosphereAccount } from "components/Icons/AtmosphereAccount";
import { EmailTiny } from "components/Icons/EmailTiny";
import { Menu, RadioMenuGroup, RadioMenuItem } from "components/Menu";
import {
  requestPublicationEmailSubscription,
  confirmPublicationEmailSubscription,
} from "actions/publications/subscribeEmail";

import { useViewerSubscription } from "./viewerSubscription";
import { Separator } from "components/Layout";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";

type SubscribeMode = "email" | "atproto";

export type SubscribeProps = {
  autoFocus?: boolean;
  compact?: boolean;
  publicationUri: string;
  publicationUrl?: string;
  publicationName: string;
  publicationDescription?: string;
  newsletterMode: boolean;
};

export const SubscribePanel = (props: SubscribeProps) => {
  return (
    <div className=" w-full">
      <div className="accent-container rounded-lg! border-none! p-0! w-full text-center justify-center">
        <div className="px-3 pt-3 pb-4 sm:px-4 sm:pt-4 sm:pb-5">
          <h3 className="leading-snug text-secondary">
            {props.publicationName}
          </h3>
          {props.publicationDescription && (
            <div className="text-tertiary">{props.publicationDescription}</div>
          )}
          <div className="w-fit max-w-full mx-auto pt-3">
            {/* The panel always has room — force the roomy (non-compact) input
                even if the caller passed compact (e.g. the modal opened from a
                compact SubscribeButton). */}
            <SubscribeInput {...props} compact={false} />
          </div>
        </div>
      </div>
    </div>
  );
};

export const SubscribeInput = (props: SubscribeProps) => {
  let toaster = useToaster();
  let router = useRouter();
  let pathname = usePathname();
  let searchParams = useSearchParams();
  const user = useViewerSubscription(props.publicationUri);
  const { identity, mutate: mutateIdentity } = useIdentityData();
  let [email, setEmail] = useState(user.email ?? "");
  let [confirmState, setConfirmState] = useState<"confirm" | "success">(
    "confirm",
  );
  let [confirmOpen, setConfirmOpen] = useState(false);
  let [requesting, setRequesting] = useState(false);
  let [confirming, setConfirming] = useState(false);
  let [locallySubscribed, setLocallySubscribed] = useState(false);
  let [linkModalOpen, setLinkModalOpen] = useState(false);
  let [subscribeMode, setSubscribeMode] = useState<SubscribeMode>("email");
  let [atSuccessOpen, setAtSuccessOpen] = useState(false);
  // Tracks that the user passed through LinkIdentityModal — when they enter
  // the confirmation code we attach the email to their current atp identity
  // (or merge from any existing email-only identity) instead of creating a
  // disconnected email-only account.
  let [linkToCurrent, setLinkToCurrent] = useState(false);

  const viewerHandle = identity?.bsky_profiles?.handle;
  const viewerAtpDid = identity?.atp_did;
  const viewerEmail = identity?.email;
  // The atp-only-but-subscribing-via-email case: signed in as a Bluesky
  // account with no email yet. The modal asks them to link the typed email
  // (or log out) before we send a confirmation code.
  const needsLinkConfirmation = !!viewerAtpDid && !viewerEmail && !!email;

  // Embedded subscribe forms (see /api/subscribe_email) redirect back here
  // with `subscribe_email=<email>` after sending the confirmation code. Open
  // the confirm modal so the user can paste the code from their inbox without
  // re-entering their email. `subscribe_email_confirmed=1` means the user was
  // already verified server-side and the modal jumps straight to success.
  useEffect(() => {
    if (!props.newsletterMode) return;
    const incomingEmail = searchParams.get("subscribe_email");
    const alreadyConfirmed =
      searchParams.get("subscribe_email_confirmed") === "1";
    const errorCode = searchParams.get("subscribe_email_error");
    if (!incomingEmail && !errorCode) return;

    if (errorCode) {
      const message =
        ERROR_MESSAGES[errorCode as SubscribeError] ??
        "We couldn't process that subscription. Try again.";
      toaster({ type: "error", content: message });
    } else if (incomingEmail) {
      setEmail(incomingEmail);
      setConfirmState(alreadyConfirmed ? "success" : "confirm");
      setConfirmOpen(true);
      if (alreadyConfirmed) {
        setLocallySubscribed(true);
        router.refresh();
      }
    }

    const next = new URLSearchParams(searchParams.toString());
    next.delete("subscribe_email");
    next.delete("subscribe_email_confirmed");
    next.delete("subscribe_email_error");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.newsletterMode]);

  const sendRequest = async (link: boolean) => {
    setRequesting(true);
    setLinkToCurrent(link);
    let res = await requestPublicationEmailSubscription(
      props.publicationUri,
      email,
    );
    setRequesting(false);
    if (!res.ok) {
      toaster({ type: "error", content: ERROR_MESSAGES[res.error] });
      return;
    }
    if (res.value.confirmed) {
      setConfirmState("success");
      router.refresh();
    }
    setConfirmOpen(true);
  };

  const showManage = props.newsletterMode
    ? user.emailSubscribed
    : user.atprotoSubscribed;
  const isSubscribed = showManage || locallySubscribed;
  const modeMenu = (
    <SubscribeModeMenu mode={subscribeMode} onChange={setSubscribeMode} />
  );
  return (
    <>
      {isSubscribed ? (
        <>
          <ManageSubscription
            publicationUri={props.publicationUri}
            publicationUrl={props.publicationUrl}
            newsletterMode={props.newsletterMode}
            user={user}
          />

          {props.newsletterMode &&
          user.atprotoSubscribed &&
          !user.emailSubscribed ? (
            <div
              className="text-secondary  w-full text-sm p-2 pt-1.5 mt-1 rounded-md flex flex-col gap-1"
              style={{
                background:
                  "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 70%",
              }}
            >
              <div className="font-bold">Opt in to get updates via email!</div>
              <div className="max-w-sm w-full mx-auto">
                <EmailInput
                  publicationUrl={props.publicationUrl}
                  value={email}
                  onChange={setEmail}
                  disabled={user.loggedIn && !!user.email}
                  autoFocus={props.autoFocus}
                  compact={props.compact}
                  loading={requesting}
                  action={
                    <ButtonPrimary
                      compact
                      className="leading-tight! outline-none! text-sm!"
                      disabled={requesting || !email}
                      onClick={async () => {
                        if (requesting) return;
                        if (needsLinkConfirmation) {
                          setLinkModalOpen(true);
                          return;
                        }
                        await sendRequest(false);
                      }}
                    >
                      Get Emails
                    </ButtonPrimary>
                  }
                />
              </div>
            </div>
          ) : null}
        </>
      ) : props.newsletterMode ? (
        <div className="max-w-sm w-full mx-auto">
          {user.loggedIn && user.email ? (
            <EmailButton
              compact={props.compact}
              publicationUri={props.publicationUri}
              publicationUrl={props.publicationUrl}
              email={user.email}
              handle={user.handle}
              onSubscribed={() => setLocallySubscribed(true)}
            />
          ) : subscribeMode === "email" ? (
            <EmailInput
              publicationUrl={props.publicationUrl}
              value={email}
              onChange={setEmail}
              disabled={user.loggedIn && !!user.email}
              autoFocus={props.autoFocus}
              compact={props.compact}
              loading={requesting}
              leading={modeMenu}
              action={
                <ButtonPrimary
                  compact
                  className="leading-tight! outline-none! text-sm!"
                  onClick={async () => {
                    if (!email || requesting) return;
                    if (needsLinkConfirmation) {
                      setLinkModalOpen(true);
                      return;
                    }
                    await sendRequest(false);
                  }}
                >
                  Subscribe
                </ButtonPrimary>
              }
            />
          ) : (
            <SubscribeWithHandle
              user={user}
              autoFocus={props.autoFocus}
              compact={props.compact}
              publicationUri={props.publicationUri}
              publicationUrl={props.publicationUrl}
              onAtSuccess={() => setAtSuccessOpen(true)}
              leading={modeMenu}
            />
          )}
        </div>
      ) : (
        <SubscribeWithHandle
          user={user}
          autoFocus={props.autoFocus}
          compact={props.compact}
          publicationUri={props.publicationUri}
          publicationUrl={props.publicationUrl}
          onSubscribed={() => setLocallySubscribed(true)}
        />
      )}
      {props.newsletterMode && needsLinkConfirmation && (
        <LinkIdentityModal
          open={linkModalOpen}
          onOpenChange={setLinkModalOpen}
          signedInAs={
            viewerHandle ? `@${viewerHandle}` : "your Bluesky account"
          }
          linkingIdentity={email}
          confirmButtonLabel="Link email"
          confirming={requesting}
          onConfirm={async () => {
            setLinkModalOpen(false);
            await sendRequest(true);
          }}
        />
      )}
      {props.newsletterMode && (
        <>
          <Modal
            open={atSuccessOpen}
            onOpenChange={(open) => {
              setAtSuccessOpen(open);
              if (!open) {
                setLocallySubscribed(true);
                mutateIdentity();
                router.refresh();
              }
            }}
          >
            <AtSubscribeSuccess />
          </Modal>
          <Modal
            open={confirmOpen}
            onOpenChange={(open) => {
              setConfirmOpen(open);
              if (!open) {
                if (confirmState === "success") setLocallySubscribed(true);
                setConfirmState("confirm");
                setLinkToCurrent(false);
              }
            }}
          >
            {confirmState === "success" ? (
              <EmailSubscribeSuccess email={email} handle={user.handle} />
            ) : (
              <EmailConfirm
                autoFocus
                loading={confirming}
                onBack={() => setConfirmOpen(false)}
                emailValue={email}
                onSubmit={async (code) => {
                  if (confirming) return;
                  setConfirming(true);
                  let res = await confirmPublicationEmailSubscription(
                    props.publicationUri,
                    email,
                    code,
                    linkToCurrent,
                  );
                  setConfirming(false);
                  if (!res.ok) {
                    toaster({
                      type: "error",
                      content: ERROR_MESSAGES[res.error],
                    });
                    return;
                  }
                  setConfirmState("success");
                  router.refresh();
                }}
              />
            )}
          </Modal>
        </>
      )}
    </>
  );
};

// Compact, single-control counterpart to SubscribeInput, for tight spaces
// (publication nav, pub listing cards). Kept as its own component rather than a
// `variant` on SubscribeInput: the inline form and the button diverge in how
// they render (always-open input vs. one-click button / popover), and folding
// them together would tangle those paths across SubscribeInput's many call
// sites. Shared logic lives in SubscribeWithHandle, EmailButton, and
// subscribeErrors so the two stay in sync.
//
//   - already subscribed         -> ManageSubscription (same as SubscribeInput)
//   - atproto pub + has handle   -> compact one-click SubscribeWithHandle
//   - newsletter pub + has email -> compact one-click EmailButton
//   - everything else            -> "Subscribe" button opening the full
//                                   SubscribeInput in a popover (needs an input:
//                                   logged out, or missing the identity the pub
//                                   requires)
export const SubscribeButton = (props: Omit<SubscribeProps, "compact">) => {
  const user = useViewerSubscription(props.publicationUri);
  let [locallySubscribed, setLocallySubscribed] = useState(false);

  const showManage = props.newsletterMode
    ? user.emailSubscribed
    : user.atprotoSubscribed;

  if (showManage || locallySubscribed) {
    return (
      <ManageSubscription
        publicationUri={props.publicationUri}
        publicationUrl={props.publicationUrl}
        newsletterMode={props.newsletterMode}
        user={user}
      />
    );
  }

  if (!props.newsletterMode && user.loggedIn && user.handle) {
    return (
      <SubscribeWithHandle
        compact
        user={user}
        publicationUri={props.publicationUri}
        publicationUrl={props.publicationUrl}
        onSubscribed={() => setLocallySubscribed(true)}
      />
    );
  }

  if (props.newsletterMode && user.loggedIn && user.email) {
    return (
      <EmailButton
        compact
        publicationUri={props.publicationUri}
        publicationUrl={props.publicationUrl}
        email={user.email}
        handle={user.handle}
        onSubscribed={() => setLocallySubscribed(true)}
      />
    );
  }

  // Logged out: there's nothing to one-click with, so open the full
  // SubscribePanel (pub name/description + form) in a modal.
  if (!user.loggedIn) {
    return (
      <Modal
        asChild
        trigger={
          <ButtonPrimary compact className="pubPageSubscribe text-sm!">
            Subscribe
          </ButtonPrimary>
        }
      >
        <div className="w-md max-w-full">
          <SubscribePanel {...props} />
        </div>
      </Modal>
    );
  }

  // Logged in but missing the identity this pub needs (a handle for atproto
  // pubs, an email for newsletters) — open the full input in a popover.
  return (
    <Popover
      asChild
      align="end"
      trigger={
        <ButtonPrimary compact className="pubPageSubscribe text-sm!">
          Subscribe
        </ButtonPrimary>
      }
    >
      <div className="w-md max-w-full">
        <SubscribeInput {...props} compact autoFocus />
      </div>
    </Popover>
  );
};

const SubscribeModeMenu = (props: {
  mode: SubscribeMode;
  onChange: (mode: SubscribeMode) => void;
}) => {
  return (
    <div className="flex gap-1">
      <Menu
        align="start"
        asChild
        // Above the Modal overlay/content (z-50) when this renders inside the
        // logged-out subscribe modal; otherwise it hides behind the overlay.
        className="z-[60]!"
        trigger={
          <button
            type="button"
            aria-label="Choose subscribe method"
            className="text-inherit  flex items-center gap-1"
          >
            {props.mode === "email" ? <EmailTiny /> : <AtmosphereAccount />}
            <ArrowDownTiny className="scale-90" />
          </button>
        }
      >
        <div className="text-tertiary text-sm px-1 pt-0.5 -mb-0.5">
          Subscribe via…
        </div>
        <RadioMenuGroup
          value={props.mode}
          onValueChange={(v) => props.onChange(v as SubscribeMode)}
        >
          <RadioMenuItem value="email" selected={props.mode === "email"}>
            <span className="flex items-center gap-2 shrink-0">
              <EmailTiny /> Email
            </span>
          </RadioMenuItem>
          <RadioMenuItem value="atproto" selected={props.mode === "atproto"}>
            <span className="flex items-center gap-2">
              <AtmosphereAccount /> Atmosphere
            </span>
          </RadioMenuItem>
        </RadioMenuGroup>
      </Menu>
      <Separator classname="h-5! " />
    </div>
  );
};
