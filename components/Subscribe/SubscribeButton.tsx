"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SubscribeWithHandle, AtSubscribeSuccess } from "./HandleSubscribe";
import { EmailInput, EmailButton, EmailConfirm } from "./EmailSubscribe";
import { EmailSubscribeSuccess } from "./EmailSubscribeSuccess";
import { LinkIdentityModal } from "./LinkIdentityModal";
import { SUBSCRIBE_ERROR_MESSAGES as ERROR_MESSAGES } from "./subscribeErrors";
import { Modal } from "components/Modal";
import { ButtonPrimary } from "components/Buttons";
import { ManageSubscription } from "./ManageSubscribe";
import { useToaster } from "components/Toast";
import {
  refreshIdentityData,
  useIdentityData,
} from "components/IdentityProvider";
import { AtmosphereAccount } from "components/Icons/AtmosphereAccount";
import { EmailTiny } from "components/Icons/EmailTiny";
import { Menu, MenuItem, RadioMenuGroup, RadioMenuItem } from "components/Menu";
import { RSSTiny } from "components/Icons/RSSTiny";
import {
  requestPublicationEmailSubscription,
  confirmPublicationEmailSubscription,
} from "actions/publications/subscribeEmail";
import { encodeActionToSearchParam } from "app/api/oauth/[route]/afterSignInActions";
import { mainSiteAuthBase } from "src/utils/customDomain";
import type { SubscriptionSource } from "src/subscriptionSource";

import { useViewerSubscription } from "./viewerSubscription";
import { useSubscribeSuccessData } from "./useSubscribeSuccessData";
import { Separator } from "components/Layout";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import { PaidSubscribeButton } from "./PaidSubscribeButton";
import { useJoinableTiers } from "components/Memberships/useJoinableTiers";

type SubscribeMode = "email" | "atproto";

// Logged-out email subscribe goes through the main-site email-login flow with a
// `subscribe` after-sign-in action, so the session is minted on the main site
// and handed back to the custom domain (see postAuthRedirect).
function redirectToEmailSubscribe(
  email: string,
  publicationUri: string,
  source?: SubscriptionSource,
) {
  let base = mainSiteAuthBase() || window.location.origin;
  let url = new URL("/api/auth/email-login", base);
  url.searchParams.set("email", email);
  url.searchParams.set("redirect", window.location.href);
  url.searchParams.set(
    "action",
    encodeActionToSearchParam({
      action: "subscribe",
      publication: publicationUri,
      // The subscribe completes after a redirect, so stamp the originating
      // page into the source now — the server won't see a useful Referer.
      ...(source ? { source: { url: window.location.href, ...source } } : {}),
    }),
  );
  window.location.href = url.toString();
}

export type SubscribeProps = {
  autoFocus?: boolean;
  compact?: boolean;
  publicationUri: string;
  publicationUrl?: string;
  publicationName: string;
  publicationDescription?: string;
  newsletterMode: boolean;
  // Analytics: where on the page this subscribe control sits.
  source?: SubscriptionSource;
};

export const SubscribePanel = (props: SubscribeProps) => {
  return (
    <div className="subscribePanel accent-container rounded-lg! border-none! p-0! w-full text-center justify-center">
      <div className="px-3 pt-3 pb-4 sm:px-4 sm:pt-4 sm:pb-5">
        <h3 className="leading-snug text-secondary">{props.publicationName}</h3>
        {props.publicationDescription && (
          <div className="text-tertiary leading-snug">
            {props.publicationDescription}
          </div>
        )}
        <div className="w-fit max-w-full mx-auto pt-3">
          <SubscribeInput {...props} />
        </div>
      </div>
    </div>
  );
};

export const SubscribeInput = (props: SubscribeProps) => {
  let toaster = useToaster();
  let router = useRouter();
  const user = useViewerSubscription(props.publicationUri);
  const { identity, mutate: mutateIdentity } = useIdentityData();
  let [email, setEmail] = useState(user.email ?? "");
  // On a published page identity resolves after first paint, so the initial
  // value above is always the logged-out one. Without this the email field
  // stays empty while EmailInput disables itself on the identity's email being
  // known — an input that can be neither typed into nor submitted. Only seeds
  // an untouched field, so it can't clobber what someone is typing.
  useEffect(() => {
    if (user.email)
      setEmail((current) => (current === "" ? user.email! : current));
  }, [user.email]);
  let [requesting, setRequesting] = useState(false);
  let [confirming, setConfirming] = useState(false);
  let [confirmOpen, setConfirmOpen] = useState(false);
  let [confirmState, setConfirmState] = useState<"confirm" | "success">(
    "confirm",
  );
  let [atSuccessOpen, setAtSuccessOpen] = useState(false);
  // Tracks that the user passed through LinkIdentityModal — when they enter the
  // confirmation code we attach the email to their current atp identity (or
  // merge from any existing email-only identity) instead of creating a
  // disconnected email-only account.
  let [linkToCurrent, setLinkToCurrent] = useState(false);
  let [locallySubscribed, setLocallySubscribed] = useState(false);
  let [linkModalOpen, setLinkModalOpen] = useState(false);
  let [subscribeMode, setSubscribeMode] = useState<SubscribeMode>("email");
  const joinable = useJoinableTiers(props.publicationUri);
  // Warm the success-modal data (pub name + recommended listings) while the
  // form is idle, so subscribing opens the modal without a loading spinner.
  useSubscribeSuccessData(props.publicationUri);

  const viewerHandle = identity?.bsky_profiles?.handle;
  const viewerAtpDid = identity?.atp_did;
  const viewerEmail = identity?.email;
  // The atp-only-but-subscribing-via-email case: signed in as a Bluesky
  // account with no email yet. The modal asks them to link the typed email
  // (or log out) before we send a confirmation code.
  const needsLinkConfirmation = !!viewerAtpDid && !viewerEmail && !!email;

  const sendRequest = async (link: boolean) => {
    setRequesting(true);
    setLinkToCurrent(link);
    let res = await requestPublicationEmailSubscription(
      props.publicationUri,
      email,
      props.source,
    );
    setRequesting(false);
    if (!res.ok) {
      toaster({ type: "error", content: ERROR_MESSAGES[res.error] });
      return;
    }
    if (res.value.confirmed) {
      setConfirmState("success");
      refreshIdentityData();
      router.refresh();
    }
    setConfirmOpen(true);
  };

  const isSubscribed = user.subscribed || locallySubscribed;
  const modeMenu = (
    <SubscribeInputModeMenu mode={subscribeMode} onChange={setSubscribeMode} />
  );
  // Paid memberships replace the subscribe form with the paid join flow.
  if (joinable.hasPaidTiers && joinable.tiers)
    return <PaidSubscribeButton {...props} tiers={joinable.tiers} />;
  const emailForm = (
    <EmailInput
      publicationUrl={props.publicationUrl}
      value={email}
      onChange={setEmail}
      disabled={user.loggedIn && !!user.email}
      loading={requesting}
      leading={modeMenu}
      onSubmit={() => {
        if (!email || requesting) return;
        if (needsLinkConfirmation) {
          setLinkModalOpen(true);
          return;
        }
        redirectToEmailSubscribe(email, props.publicationUri, props.source);
      }}
      action={
        <ButtonPrimary
          type="submit"
          compact
          className="leading-tight! outline-none! text-sm!"
        >
          Subscribe
        </ButtonPrimary>
      }
    />
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
          !user.emailEnabled ? (
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
                  loading={requesting}
                  onSubmit={async () => {
                    if (requesting || !email) return;
                    if (needsLinkConfirmation) {
                      setLinkModalOpen(true);
                      return;
                    }
                    await sendRequest(false);
                  }}
                  action={
                    <ButtonPrimary
                      type="submit"
                      compact
                      className="leading-tight! outline-none! text-sm!"
                      disabled={requesting || !email}
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
              publicationUri={props.publicationUri}
              publicationUrl={props.publicationUrl}
              source={props.source}
              email={user.email}
              handle={user.handle}
              onSubscribed={() => setLocallySubscribed(true)}
              onSuccess={(mode) => {
                if (mode === "email") {
                  setConfirmState("success");
                  setConfirmOpen(true);
                } else setAtSuccessOpen(true);
              }}
            />
          ) : subscribeMode === "email" ? (
            emailForm
          ) : (
            <SubscribeWithHandle
              user={user}
              publicationUri={props.publicationUri}
              publicationUrl={props.publicationUrl}
              source={props.source}
              onAtSuccess={() => setAtSuccessOpen(true)}
              leading={modeMenu}
            />
          )}
        </div>
      ) : (
        <SubscribeWithHandle
          user={user}
          publicationUri={props.publicationUri}
          publicationUrl={props.publicationUrl}
          source={props.source}
          onSubscribed={() => setLocallySubscribed(true)}
          onAtSuccess={() => setAtSuccessOpen(true)}
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
        <AtSubscribeSuccess publicationUri={props.publicationUri} />
      </Modal>
      {props.newsletterMode && (
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
            <EmailSubscribeSuccess
              email={email}
              handle={user.handle}
              publicationUri={props.publicationUri}
            />
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
                  props.source,
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
                refreshIdentityData();
                router.refresh();
              }}
            />
          )}
        </Modal>
      )}
    </>
  );
};

export const SubscribeButton = (props: SubscribeProps) => {
  const user = useViewerSubscription(props.publicationUri);
  let [locallySubscribed, setLocallySubscribed] = useState(false);
  let [atSuccessOpen, setAtSuccessOpen] = useState(false);
  let [emailSuccessOpen, setEmailSuccessOpen] = useState(false);
  const joinable = useJoinableTiers(props.publicationUri);

  // Paid memberships replace the one-click subscribe with the paid join flow.
  if (joinable.hasPaidTiers && joinable.tiers)
    return <PaidSubscribeButton {...props} tiers={joinable.tiers} compact />;

  const subscribeTrigger = (
    <ButtonPrimary compact className="pubPageSubscribe text-sm!">
      Subscribe
    </ButtonPrimary>
  );

  return (
    <>
      {user.subscribed || locallySubscribed ? (
        <ManageSubscription
          publicationUri={props.publicationUri}
          publicationUrl={props.publicationUrl}
          newsletterMode={props.newsletterMode}
          user={user}
        />
      ) : !props.newsletterMode && user.loggedIn && user.handle ? (
        <SubscribeWithHandle
          compact
          user={user}
          publicationUri={props.publicationUri}
          publicationUrl={props.publicationUrl}
          source={props.source}
          onSubscribed={() => setLocallySubscribed(true)}
          onAtSuccess={() => setAtSuccessOpen(true)}
        />
      ) : props.newsletterMode && user.loggedIn && user.email ? (
        <EmailButton
          compact
          publicationUri={props.publicationUri}
          publicationUrl={props.publicationUrl}
          source={props.source}
          email={user.email}
          handle={user.handle}
          onSubscribed={() => setLocallySubscribed(true)}
          onSuccess={(mode) => {
            if (mode === "email") setEmailSuccessOpen(true);
            else setAtSuccessOpen(true);
          }}
        />
      ) : (
        // Nothing to one-click with — either logged out, or logged in but
        // missing the identity this pub needs (a handle for atproto pubs, an
        // email for newsletters). Both open the full SubscribePanel (pub
        // name/description + form) in a modal.
        <Modal asChild trigger={subscribeTrigger}>
          <div className="w-md max-w-full">
            <SubscribePanel {...props} />
          </div>
        </Modal>
      )}
      <Modal
        open={atSuccessOpen}
        onOpenChange={(open) => {
          if (!open) setAtSuccessOpen(false);
        }}
      >
        <AtSubscribeSuccess publicationUri={props.publicationUri} />
      </Modal>
      <Modal
        open={emailSuccessOpen}
        onOpenChange={(open) => {
          if (!open) setEmailSuccessOpen(false);
        }}
      >
        <EmailSubscribeSuccess
          email={user.email}
          handle={user.handle}
          publicationUri={props.publicationUri}
        />
      </Modal>
    </>
  );
};

export const SubscribeInputModeMenu = (props: {
  mode: SubscribeMode;
  onChange: (mode: SubscribeMode) => void;
}) => {
  return (
    <div className="flex gap-1">
      <Menu
        align="start"
        asChild
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

export type SubscribeButtonModeMenuAccount = {
  value: SubscribeMode;
  label: string;
  icon: React.ReactNode;
  // The account the main button currently subscribes with — marked in the menu.
  selected: boolean;
  // Subscribe with this account directly, rather than just toggling selection.
  onSelect: () => void;
};

// The caret dropdown beside the compact subscribe button. Each account is a
// one-click subscribe (it runs the subscribe action, not just a toggle), and
// the optional RSS item links the feed. Shared by the atproto (HandleSubscribe)
// and email (EmailSubscribe) buttons.
export const SubscribeButtonModeMenu = (props: {
  disabled: boolean;
  publicationUrl?: string;
  accounts: SubscribeButtonModeMenuAccount[];
}) => {
  let selectedValue =
    props.accounts.find((a) => a.selected)?.value ?? props.accounts[0]?.value;
  return (
    <Menu
      align="end"
      asChild
      className="text-sm"
      trigger={
        <ButtonPrimary
          compact
          disabled={props.disabled}
          aria-label="Choose how to subscribe"
          className="rounded-l-none! border-l-accent-2! py-0! h-full! hover:outline-transparent! focus:outline-transparent! active:outline-transparent! px-0.5!"
        >
          <ArrowDownTiny />
        </ButtonPrimary>
      }
    >
      <div className="text-tertiary text-sm px-1 pt-0.5 ">Subscribe with…</div>
      <RadioMenuGroup value={selectedValue ?? ""}>
        {props.accounts.map((account) => (
          <RadioMenuItem
            key={account.value}
            className="py-0.5! font-normal!"
            value={account.value}
            selected={account.selected}
            onSelect={() => account.onSelect()}
          >
            <span className="flex items-center gap-2 min-w-0">
              {account.icon}
              <span className="truncate">{account.label}</span>
            </span>
          </RadioMenuItem>
        ))}
      </RadioMenuGroup>

      {props.publicationUrl && (
        <MenuItem
          className="py-0.5! font-normal!"
          onSelect={() =>
            window.open(
              `${props.publicationUrl}/rss`,
              "_blank",
              "noopener,noreferrer",
            )
          }
        >
          <span className="flex items-center gap-2">
            <RSSTiny className="shrink-0 text-tertiary" /> RSS Feed
          </span>
        </MenuItem>
      )}
    </Menu>
  );
};
