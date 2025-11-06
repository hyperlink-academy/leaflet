"use client";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { useActionState, useEffect, useState } from "react";
import { Input, InputWithLabel } from "components/Input";
import { useIdentityData } from "components/IdentityProvider";
import {
  confirmEmailAuthToken,
  requestAuthEmailToken,
} from "actions/emailAuth";
import { subscribeToPublicationWithEmail } from "actions/subscribeToPublicationWithEmail";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { Popover } from "components/Popover";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { useToaster } from "components/Toast";
import {
  subscribeToPublication,
  unsubscribeToPublication,
} from "./subscribeToPublication";
import { DotLoader } from "components/utils/DotLoader";
import { RSSSmall } from "components/Icons/RSSSmall";
import { SpeedyLink } from "components/SpeedyLink";
import { PgBooleanBuilderInitial } from "drizzle-orm/pg-core";

type State =
  | { state: "default" }
  | { state: "email" }
  | { state: "code"; token: string }
  | { state: "success" };

let email = "thisiscelinepark@gmail.com";

export const SubscribeWithBluesky = (props: {
  isPost?: boolean;
  pubName: string;
  pub_uri: string;
  base_url: string;
  subscribers: { identity: string }[];
}) => {
  let { identity } = useIdentityData();
  let subscribed = false;
  // identity?.atp_did &&
  // props.subscribers.find((s) => s.identity === identity.atp_did);

  if (subscribed) {
    return <ManageSubscriptionButton {...props} />;
  }
  return (
    <div className="flex flex-col gap-2 text-center justify-center">
      {props.isPost && (
        <div className="text-sm text-tertiary font-bold">
          Get updates from {props.pubName}!
        </div>
      )}
      <SubscribeButton {...props} />
    </div>
  );
};

let SubscribeButton = (props: {
  pub_uri: string;
  isPost?: boolean;
  pubName: string;
  base_url: string;
  subscribers: { identity: string }[];
}) => {
  let { identity } = useIdentityData();
  let [, subscribe, subscribePending] = useActionState(async () => {
    let result = await subscribeToPublication(
      props.pub_uri,
      window.location.href + "?refreshAuth",
    );
  }, null);
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
    return <ManageSubscriptionButton {...props} />;
  }
  return (
    <div className="flex flex-col gap-2 text-center justify-center">
      {props.isPost && (
        <div className="text-sm text-tertiary font-bold">
          Get updates from {props.pubName}!
        </div>
      )}
      <div className="flex flex-row gap-2 place-self-center">
        <Popover
          asChild
          className="max-w-xs w-[1000px]"
          trigger={
            <ButtonPrimary>
              {subscribePending ? <DotLoader /> : <>Subscribe for Updates</>}
            </ButtonPrimary>
          }
        >
          <SubscribeForm pub_uri={props.pub_uri} base_url={props.base_url} />
        </Popover>
        <a href={`${props.base_url}/rss`} className="flex" target="_blank">
          <RSSSmall className="self-center" />
        </a>
      </div>
    </div>
  );
};

const ManageSubscriptionButton = (props: {
  isPost?: boolean;
  pubName: string;
  pub_uri: string;
  base_url: string;
  subscribers: { identity: string }[];
}) => {
  return (
    <div
      className={`flex ${props.isPost ? "flex-col " : "gap-2"}  justify-center text-center`}
    >
      <div className="font-bold text-tertiary text-sm ">
        You&apos;re Subscribed{props.isPost ? ` to ${props.pubName}` : "!"}
      </div>
      <Popover
        className="manageSub max-w-xs flex flex-col gap-3 w-[600px]"
        trigger={
          <div className="manageSubTrigger text-accent-contrast text-sm font-bold ">
            Manage
          </div>
        }
      >
        <SubscribeForm {...props} />
      </Popover>
    </div>
  );
};

export const SubscribeForm = (props: {
  isPost: boolean;
  pubName: string;
  pub_uri: string;
  subscribed?: boolean;
  base_url: string;
}) => {
  let { identity } = useIdentityData();
  let [state, setState] = useState<State>({ state: "default" });

  let [emailInputValue, setEmailInputValue] = useState("");

  if (state.state === "default")
    return props.subscribed ? (
      <ManageSubscriptionOptions
        isPost={props.isPost}
        state={state}
        setState={setState}
        pub_uri={props.pub_uri}
        base_url={props.base_url}
        pubName={props.pubName}
      />
    ) : (
      <LoginToSubscribe
        pub_uri={props.pub_uri}
        base_url={props.base_url}
        state={state}
        setState={setState}
        emailInputValue={emailInputValue}
        setEmailInputValue={setEmailInputValue}
      />
    );
  if (state.state === "email") {
    return (
      <EmailInput
        state={state}
        setState={setState}
        emailInputValue={emailInputValue}
        setEmailInputValue={setEmailInputValue}
        pub_uri={props.pub_uri}
      />
    );
  }
  if (state.state === "code")
    return (
      <ConfirmCode
        pub_uri={props.pub_uri}
        state={state}
        setState={setState}
        emailInputValue={emailInputValue}
        token={state.token}
      />
    );
  if (state.state === "success") {
    return (
      <Success
        state={state}
        setState={setState}
        emailInputValue={emailInputValue}
        setEmailInputValue={setEmailInputValue}
        pub_uri={props.pub_uri}
        subscribed={!!props.subscribed}
      />
    );
  }
};

const LoginToSubscribe = (props: {
  state: State;
  setState: (s: State) => void;
  emailInputValue: string;
  setEmailInputValue: (s: string) => void;
  pub_uri: string;
  base_url: string;
}) => {
  return (
    <div className="place-self-center justify-center flex flex-col gap-2 py-1  w-full">
      <EmailInput
        pub_uri={props.pub_uri}
        state={props.state}
        setState={props.setState}
        emailInputValue={props.emailInputValue}
        setEmailInputValue={props.setEmailInputValue}
        label={null}
      />
      <div className="flex text-tertiary italic text-sm gap-2 items-center w-full">
        <hr className="border-border-light grow" />
        or
        <hr className="border-border-light grow" />{" "}
      </div>
      <div className="flex flex-col justify-center place-items-center gap-1">
        {/* THIS WILL TAKE YOU TO THE BSKY AUTH,
          ONCE YOURE DONT WITH THAT, IT SHOULD COME BACK HERE
          WITH THE SUCCESS POPOVER OPEN (so that know it worked and can change email) */}
        <ButtonPrimary fullWidth>
          <BlueskyTiny />
          Subscribe with Bluesky
        </ButtonPrimary>
        <button className="text-accent-contrast text-sm">
          or use an ATProto Handle
        </button>
      </div>
    </div>
  );
};

const ManageSubscriptionOptions = (props: {
  state: State;
  setState: (s: State) => void;
  pub_uri: string;
  base_url: string;
  isPost: boolean;
  pubName: string;
}) => {
  let toaster = useToaster();
  let { identity } = useIdentityData();
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
        You&apos;re Subscribed{props.isPost ? ` to ` : "!"}
        {props.isPost && (
          <SpeedyLink href={props.base_url} className="text-accent-contrast">
            {props.pubName}
          </SpeedyLink>
        )}
      </div>
      <Popover
        trigger={<div className="text-accent-contrast text-sm">Manage</div>}
      >
        <div className="max-w-sm flex flex-col gap-1">
          <h4>Update Options</h4>
          <div className="flex flex-col w-full">
            <div className="flex justify-between text-accent-contrast">
              <div className="text-secondary font-bold">Email</div>
              <button
                className=" place-self-center font-bold"
                onClick={() => props.setState({ state: "email" })}
              >
                Change
              </button>
            </div>
            <div className="text-sm text-tertiary">
              Receiving updates to <span className="italic">{email}</span>
            </div>
          </div>
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
            href={`${props.base_url}/rss`}
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
        </div>{" "}
      </Popover>
    </div>
  );
};

const EmailInput = (props: {
  state: State;
  setState: (state: State) => void;
  pub_uri: string;
  emailInputValue: string;
  setEmailInputValue: (value: string) => void;
  label?: React.ReactNode | null;
}) => {
  let { identity, mutate } = useIdentityData();
  async function emailSubmit() {
    if (identity?.email) {
      await subscribeToPublicationWithEmail(props.pub_uri);
      //optimistically could add!
      await mutate();
      return;
    }
    let tokenID = await requestAuthEmailToken(props.emailInputValue);
    props.setState({ state: "code", token: tokenID });
  }

  return (
    <form
      action={emailSubmit}
      className=" flex flex-col gap-2 text-center justify-center text-secondary"
    >
      {props.label !== undefined ? (
        props.label
      ) : props.label === null ? null : (
        <h4>Enter your email</h4>
      )}
      <div className="subscribeEmailInput flex gap-1 relative">
        <Input
          type="email"
          className="input-with-border w-full! pr-[36px]!"
          placeholder="me@email.com"
          value={props.emailInputValue}
          onChange={(e) => props.setEmailInputValue(e.target.value)}
        />
        <ButtonPrimary
          compact
          disabled={props.emailInputValue === "" || !props.emailInputValue}
          className="absolute right-1 top-1 h-[22px]! w-[22px]! outline-0!"
          style={{ height: "22px", width: "22px" }}
          type="submit"
        >
          <ArrowRightTiny />
        </ButtonPrimary>
      </div>
    </form>
  );
};

const ConfirmCode = (props: {
  state: State;
  setState: (state: State) => void;
  pub_uri: string;
  emailInputValue: string;
  token: string;
}) => {
  let { mutate } = useIdentityData();
  let [codeInputValue, setCodeInputValue] = useState("");

  async function codeSubmit() {
    console.log(await confirmEmailAuthToken(props.token, codeInputValue));

    await subscribeToPublicationWithEmail(props.pub_uri);
    //optimistically could add!
    await mutate();
    props.setState({ state: "success" });
    return;
  }

  return (
    <form
      action={codeSubmit}
      className=" flex flex-col gap-2 py-1 text-center justify-center text-secondary"
    >
      <div className="flex flex-col">
        <div className="font-bold">Enter the code sent to </div>
        <div className="italic">{props.emailInputValue}</div>
      </div>
      <div className="subscribeEmailCodeInput flex gap-1 mx-auto relative">
        <Input
          type="number"
          className="input-with-border pr-[88px]! py-1! max-w-[156px]"
          placeholder="000000"
          value={codeInputValue}
          onChange={(e) => setCodeInputValue(e.target.value)}
        />
        <ButtonPrimary
          compact
          type="submit"
          disabled={codeInputValue === "" || !codeInputValue}
          className="absolute right-1 top-1 outline-0!"
        >
          Confirm
        </ButtonPrimary>
      </div>
    </form>
  );
};

const Success = (props: {
  pub_uri: string;
  subscribed: boolean;
  state: State;
  setState: (s: State) => void;
  emailInputValue: string;
  setEmailInputValue: (value: string) => void;
}) => {
  return (
    <div className="subscribeSuccess flex flex-col text-center justify-normal py-1">
      <div className="bg-test h-12 w-16 mx-auto" />
      <h4 className="pt-1">
        {props.subscribed ? "Email Updated!" : "Subscribed!"}
      </h4>
      {email ? (
        <>
          <div className="pb-2 text-secondary text-sm">
            <div>You'll receive updates at </div>
            <div className=" italic">{email}</div>
          </div>
          {props.subscribed ? (
            <button
              className="text-sm text-accent-contrast font-bold"
              onClick={() => props.setState({ state: "default" })}
            >
              Back
            </button>
          ) : (
            <button
              className="text-sm text-accent-contrast font-bold"
              onClick={() => props.setState({ state: "email" })}
            >
              Edit Email
            </button>
          )}
        </>
      ) : (
        <>
          <EmailInput
            label={
              <div className="text-sm">
                Link an email for updates <br />
                directly to your inbox
              </div>
            }
            pub_uri={props.pub_uri}
            state={props.state}
            setState={props.setState}
            emailInputValue={props.emailInputValue}
            setEmailInputValue={props.setEmailInputValue}
          />
        </>
      )}
    </div>
  );
};
