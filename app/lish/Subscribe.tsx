"use client";
import { ButtonPrimary } from "components/Buttons";
import { useActionState, useEffect, useState } from "react";
import { Input } from "components/Input";
import { useIdentityData } from "components/IdentityProvider";
import {
  confirmEmailAuthToken,
  requestAuthEmailToken,
} from "actions/emailAuth";
import { subscribeToPublicationWithEmail } from "actions/subscribeToPublicationWithEmail";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { ShareSmall } from "components/Icons/ShareSmall";
import { Popover } from "components/Popover";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { useToaster } from "components/Toast";
import * as Dialog from "@radix-ui/react-dialog";
import {
  subscribeToPublication,
  unsubscribeToPublication,
} from "./subscribeToPublication";
import { DotLoader } from "components/utils/DotLoader";
import { addFeed } from "./addFeed";
import { useSearchParams } from "next/navigation";
import LoginForm from "app/login/LoginForm";
import { RSSSmall } from "components/Icons/RSSSmall";
import { OAuthErrorMessage, isOAuthSessionError } from "components/OAuthError";

export const SubscribeWithBluesky = (props: {
  pubName: string;
  pub_uri: string;
  base_url: string;
  subscribers: { identity: string }[];
}) => {
  let { identity } = useIdentityData();
  let searchParams = useSearchParams();
  let [successModalOpen, setSuccessModalOpen] = useState(
    !!searchParams.has("showSubscribeSuccess"),
  );
  let subscribed =
    identity?.atp_did &&
    props.subscribers.find((s) => s.identity === identity.atp_did);

  if (successModalOpen)
    return (
      <SubscribeSuccessModal
        open={successModalOpen}
        setOpen={setSuccessModalOpen}
      />
    );
  if (subscribed) {
    return <ManageSubscription {...props} />;
  }
  return (
    <div className="flex flex-col gap-2 text-center justify-center">
      <div className="flex flex-row gap-2 place-self-center">
        <BlueskySubscribeButton
          pub_uri={props.pub_uri}
          setSuccessModalOpen={setSuccessModalOpen}
        />
        <a
          href={`${props.base_url}/rss`}
          className="flex"
          target="_blank"
          aria-label="Subscribe to RSS"
        >
          <RSSSmall className="self-center" aria-hidden />
        </a>
      </div>
    </div>
  );
};

export const ManageSubscription = (props: {
  pub_uri: string;
  subscribers: { identity: string }[];
  base_url: string;
}) => {
  let toaster = useToaster();
  let [hasFeed] = useState(false);
  let [, unsubscribe, unsubscribePending] = useActionState(async () => {
    await unsubscribeToPublication(props.pub_uri);
    toaster({
      content: "You unsubscribed.",
      type: "success",
    });
  }, null);
  return (
    <Popover
      trigger={
        <div className="text-accent-contrast text-sm">Manage Subscription</div>
      }
    >
      <div className="max-w-sm flex flex-col gap-1">
        <h4>Update Options</h4>

        {!hasFeed && (
          <a
            href="https://bsky.app/profile/leaflet.pub/feed/subscribedPublications"
            target="_blank"
            className=" place-self-center"
          >
            <ButtonPrimary fullWidth compact className="!px-4">
              View Bluesky Custom Feed
            </ButtonPrimary>
          </a>
        )}

        <a
          href={`https://${props.base_url}/rss`}
          className="flex"
          target="_blank"
          aria-label="Subscribe to RSS"
        >
          <ButtonPrimary fullWidth compact>
            Get RSS
          </ButtonPrimary>
        </a>

        <hr className="border-border-light my-1" />

        <form action={unsubscribe}>
          <button className="font-bold text-accent-contrast w-max place-self-center">
            {unsubscribePending ? <DotLoader /> : "Unsubscribe"}
          </button>
        </form>
      </div>
    </Popover>
  );
};

let BlueskySubscribeButton = (props: {
  pub_uri: string;
  setSuccessModalOpen: (open: boolean) => void;
}) => {
  let { identity } = useIdentityData();
  let toaster = useToaster();
  let [oauthError, setOauthError] = useState<
    import("src/atproto-oauth").OAuthSessionError | null
  >(null);
  let [, subscribe, subscribePending] = useActionState(async () => {
    setOauthError(null);
    let result = await subscribeToPublication(
      props.pub_uri,
      window.location.href + "?refreshAuth",
    );
    if (!result.success) {
      if (isOAuthSessionError(result.error)) {
        setOauthError(result.error);
      }
      return;
    }
    if (result.hasFeed === false) {
      props.setSuccessModalOpen(true);
    }
    toaster({ content: <div>You're Subscribed!</div>, type: "success" });
  }, null);

  let [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!identity?.atp_did) {
    return (
      <Popover
        asChild
        trigger={
          <ButtonPrimary className="place-self-center">
            <BlueskyTiny /> Subscribe with Bluesky
          </ButtonPrimary>
        }
      >
        {isClient && (
          <LoginForm
            text="Log in to subscribe to this publication!"
            noEmail
            redirectRoute={window?.location.href + "?refreshAuth"}
            action={{ action: "subscribe", publication: props.pub_uri }}
          />
        )}
      </Popover>
    );
  }

  return (
    <div className="flex flex-col gap-2 place-self-center">
      <form
        action={subscribe}
        className="place-self-center flex flex-row gap-1"
      >
        <ButtonPrimary>
          {subscribePending ? (
            <DotLoader />
          ) : (
            <>
              <BlueskyTiny /> Subscribe with Bluesky
            </>
          )}
        </ButtonPrimary>
      </form>
      {oauthError && (
        <OAuthErrorMessage
          error={oauthError}
          className="text-center text-sm text-accent-1"
        />
      )}
    </div>
  );
};

const SubscribeSuccessModal = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) => {
  let searchParams = useSearchParams();
  let [loading, setLoading] = useState(false);
  let toaster = useToaster();
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-primary data-[state=open]:animate-overlayShow opacity-10 blur-xs" />
        <Dialog.Content
          className={`
      z-20 opaque-container
      fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
      w-96 px-3 py-4
      max-w-(--radix-popover-content-available-width)
      max-h-(--radix-popover-content-available-height)
      overflow-y-scroll no-scrollbar
      flex flex-col gap-1 text-center justify-center
      `}
        >
          <Dialog.Title asChild={true}>
            <h3>Subscribed!</h3>
          </Dialog.Title>
          <Dialog.Description className="w-full flex flex-col">
            You'll get updates about this publication via a Feed just for you.
            <ButtonPrimary
              className="place-self-center mt-4"
              onClick={async () => {
                if (loading) return;

                setLoading(true);
                let feedurl =
                  "https://bsky.app/profile/leaflet.pub/feed/subscribedPublications";
                await addFeed();
                toaster({ content: "Feed added!", type: "success" });
                setLoading(false);
                window.open(feedurl, "_blank");
              }}
            >
              {loading ? <DotLoader /> : "Add Bluesky Feed"}
            </ButtonPrimary>
            <button
              className="text-accent-contrast mt-1"
              onClick={() => {
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete("showSubscribeSuccess");
                window.history.replaceState({}, "", newUrl.toString());
                setOpen(false);
              }}
            >
              No thanks
            </button>
          </Dialog.Description>
          <Dialog.Close />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export const SubscribeOnPost = () => {
  return <div></div>;
};
