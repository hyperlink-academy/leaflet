"use client";
import { ButtonPrimary } from "components/Buttons";
import { useActionState, useState } from "react";
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
import { subscribeToPublication, unsubscribeToPublication } from "./subscribe";
import { DotLoader } from "components/utils/DotLoader";
import { addFeed } from "./addFeed";
import { useSearchParams } from "next/navigation";

type State =
  | { state: "email" }
  | { state: "code"; token: string }
  | { state: "success" };
export const SubscribeButton = (props: {
  compact?: boolean;
  publication: string;
}) => {
  let { identity, mutate } = useIdentityData();
  let [emailInputValue, setEmailInputValue] = useState("");
  let [codeInputValue, setCodeInputValue] = useState("");
  let [state, setState] = useState<State>({ state: "email" });

  if (state.state === "email") {
    return (
      <div className="flex gap-2">
        <div className="flex relative w-full max-w-sm">
          <Input
            type="email"
            className="input-with-border !pr-[104px] !py-1 grow w-full"
            placeholder={
              props.compact ? "subscribe with email..." : "email here..."
            }
            disabled={!!identity?.email}
            value={identity?.email ? identity.email : emailInputValue}
            onChange={(e) => {
              setEmailInputValue(e.currentTarget.value);
            }}
          />
          <ButtonPrimary
            compact
            className="absolute right-1 top-1 !outline-0"
            onClick={async () => {
              if (identity?.email) {
                await subscribeToPublicationWithEmail(props.publication);
                //optimistically could add!
                await mutate();
                return;
              }
              let tokenID = await requestAuthEmailToken(emailInputValue);
              setState({ state: "code", token: tokenID });
            }}
          >
            {props.compact ? (
              <ArrowRightTiny className="w-4 h-6" />
            ) : (
              "Subscribe"
            )}
          </ButtonPrimary>
        </div>
        {/* <ShareButton /> */}
      </div>
    );
  }
  if (state.state === "code") {
    return (
      <div
        className="w-full flex flex-col justify-center place-items-center p-4 rounded-md"
        style={{
          background:
            "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 85%)",
        }}
      >
        <div className="flex flex-col leading-snug text-secondary">
          <div>Please enter the code we sent to </div>
          <div className="italic font-bold">{emailInputValue}</div>
        </div>

        <ConfirmCodeInput
          publication={props.publication}
          token={state.token}
          codeInputValue={codeInputValue}
          setCodeInputValue={setCodeInputValue}
          setState={setState}
        />

        <button
          className="text-accent-contrast text-sm mt-1"
          onClick={() => {
            setState({ state: "email" });
          }}
        >
          Re-enter Email
        </button>
      </div>
    );
  }

  if (state.state === "success") {
    return (
      <div
        className={`w-full flex flex-col gap-2 justify-center place-items-center p-4 rounded-md text-secondary ${props.compact ? "py-1 animate-bounce" : "p-4"}`}
        style={{
          background:
            "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 85%)",
        }}
      >
        <div className="flex gap-2 leading-snug font-bold italic">
          <div>You're subscribed!</div>
          {/* <ShareButton /> */}
        </div>
      </div>
    );
  }
};

export const ShareButton = () => {
  return (
    <button className="text-accent-contrast">
      <ShareSmall />
    </button>
  );
};

const ConfirmCodeInput = (props: {
  codeInputValue: string;
  token: string;
  setCodeInputValue: (value: string) => void;
  setState: (state: State) => void;
  publication: string;
}) => {
  let { mutate } = useIdentityData();
  return (
    <div className="relative w-fit mt-2">
      <Input
        type="text"
        pattern="[0-9]"
        className="input-with-border !pr-[88px] !py-1 max-w-[156px]"
        placeholder="000000"
        value={props.codeInputValue}
        onChange={(e) => {
          props.setCodeInputValue(e.currentTarget.value);
        }}
      />
      <ButtonPrimary
        compact
        className="absolute right-1 top-1 !outline-0"
        onClick={async () => {
          console.log(
            await confirmEmailAuthToken(props.token, props.codeInputValue),
          );

          await subscribeToPublicationWithEmail(props.publication);
          //optimistically could add!
          await mutate();
          props.setState({ state: "success" });
          return;
        }}
      >
        Confirm
      </ButtonPrimary>
    </div>
  );
};

export const SubscribeWithBluesky = (props: {
  isPost?: boolean;
  pubName: string;
  pub_uri: string;
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
      {props.isPost && (
        <div className="text-sm text-tertiary font-bold">
          Get updates from {props.pubName}!
        </div>
      )}
      <BlueskySubscribeButton
        pub_uri={props.pub_uri}
        setSuccessModalOpen={setSuccessModalOpen}
      />
    </div>
  );
};

const ManageSubscription = (props: {
  isPost?: boolean;
  pubName: string;
  pub_uri: string;
  subscribers: { identity: string }[];
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
    <div
      className={`flex ${props.isPost ? "flex-col " : "gap-2"}  justify-center text-center`}
    >
      <div className="font-bold text-tertiary text-sm">
        You&apos;re Subscribed{props.isPost ? ` to ${props.pubName}` : "!"}
      </div>
      <Popover
        trigger={<div className="text-accent-contrast text-sm">Manage</div>}
      >
        <div className="max-w-sm flex flex-col gap-3 justify-center text-center">
          {!hasFeed && (
            <>
              <div className="flex flex-col gap-2 font-bold text-secondary w-full">
                Updates via Bluseky custom feed!
                <a
                  href="https://bsky.app/profile/leaflet.pub/feed/subscribedPublications"
                  target="_blank"
                  className=" place-self-center"
                >
                  <ButtonPrimary>View Feed</ButtonPrimary>
                </a>
              </div>
              <hr className="border-border-light" />
            </>
          )}
          <form action={unsubscribe}>
            <button className="font-bold text-accent-contrast w-max place-self-center">
              {unsubscribePending ? <DotLoader /> : "Unsubscribe"}
            </button>
          </form>
        </div>{" "}
      </Popover>
    </div>
  );
};

let BlueskySubscribeButton = (props: {
  pub_uri: string;
  setSuccessModalOpen: (open: boolean) => void;
}) => {
  let [, subscribe, subscribePending] = useActionState(async () => {
    let result = await subscribeToPublication(
      props.pub_uri,
      window.location.href + "?refreshAuth",
    );
    if (result.hasFeed === false) {
      props.setSuccessModalOpen(true);
    }
  }, null);

  return (
    <>
      <form action={subscribe} className="place-self-center">
        <ButtonPrimary>
          {subscribePending ? (
            <DotLoader />
          ) : (
            <>
              <BlueskyTiny /> Subscribe with Bluesky{" "}
            </>
          )}
        </ButtonPrimary>
      </form>
    </>
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
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-primary data-[state=open]:animate-overlayShow opacity-10 blur-sm" />
        <Dialog.Content
          className={`
      z-20 opaque-container
      fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
      w-96 px-3 py-4
      max-w-[var(--radix-popover-content-available-width)]
      max-h-[var(--radix-popover-content-available-height)]
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
                let feedurl =
                  "https://bsky.app/profile/leaflet.pub/feed/subscribedPublications";
                await addFeed();
                window.open(feedurl, "_blank");
              }}
            >
              Add Bluesky Feed
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
