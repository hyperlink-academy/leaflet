"use client";
import { ButtonPrimary } from "components/Buttons";
import { useState } from "react";
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
}) => {
  let [subscribed, setSubscribed] = useState(false);
  let [hasFeed, setHasFeed] = useState(false);
  let toaster = useToaster();

  if (subscribed) {
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
                <div className="flex flex-col gap-2 font-bold text-secondary">
                  Updates via Bluseky custom feed!
                  {/* TODO : WIRE UP FEED LINK */}
                  <ButtonPrimary className=" place-self-center">
                    Get Feed
                  </ButtonPrimary>
                </div>
                <hr className="border-border-light" />
              </>
            )}
            {/* TODO: WIRE UP UNSUBSCRIBE */}
            <button
              className="font-bold text-accent-contrast w-max place-self-center"
              onClick={() => {
                setSubscribed(false);
                toaster({
                  content: "You unsubscribed.",
                  type: "success",
                });
              }}
            >
              Unsubscribe
            </button>
          </div>{" "}
        </Popover>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 text-center">
      {props.isPost && (
        <div className="text-sm text-tertiary font-bold">
          Get updates from {props.pubName}!
        </div>
      )}
      {/* TODO: WIRE UP SUBSCRIBE */}
      {hasFeed ? (
        <ButtonPrimary
          className="place-self-center"
          onClick={() => {
            setSubscribed(true);
            if (hasFeed) {
              toaster({
                content: "You Subscribed. Welcome!",
                type: "success",
              });
            }
          }}
        >
          <BlueskyTiny /> Subscribe
        </ButtonPrimary>
      ) : (
        <SuccessModal setSubscribed={setSubscribed} />
      )}
    </div>
  );
};

const SuccessModal = (props: { setSubscribed: (s: boolean) => void }) => {
  let [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <ButtonPrimary
          className="place-self-center"
          onClick={() => {
            // props.setSubscribed(true);
            setOpen(true);
          }}
        >
          <BlueskyTiny /> Subscribe with Bluesky
        </ButtonPrimary>
      </Dialog.Trigger>
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
          <Dialog.Title>
            <h3>Subscribed!</h3>
          </Dialog.Title>
          <Dialog.Description>
            You'll get updates about this publication via a Feed just for you.
            <ButtonPrimary className="place-self-center mt-4">
              Add Bluesky Feed
            </ButtonPrimary>
            <button
              className="text-accent-contrast mt-1"
              onClick={() => {
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
