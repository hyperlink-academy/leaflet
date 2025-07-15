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

type State =
  | { state: "login" }
  | { state: "email" }
  | { state: "code"; token: string }
  | { state: "success" };

export const Subscribe = (props: {
  isPost?: boolean;
  pubName: string;
  pub_uri: string;
  base_url: string;
  subscribers: { identity: string }[];
}) => {
  let { identity } = useIdentityData();
  let subscribed =
    identity?.atp_did &&
    props.subscribers.find((s) => s.identity === identity.atp_did);

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
      <div className="flex flex-row gap-2 place-self-center">
        <SubscribeButton {...props} />
        <a href={`${props.base_url}/rss`} className="flex" target="_blank">
          <RSSSmall className="self-center" />
        </a>
      </div>
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

  let subscribed =
    identity?.atp_did &&
    props.subscribers.find((s) => s.identity === identity.atp_did);

  if (subscribed) {
    return <ManageSubscription {...props} />;
  }
  return (
    <>
      <Popover
        asChild
        className="max-w-xs w-[1000px]"
        trigger={
          <ButtonPrimary>
            {subscribePending ? <DotLoader /> : <>Subscribe for Updates</>}
          </ButtonPrimary>
        }
      >
        <SubscribeForm publication={props.pub_uri} />
      </Popover>
    </>
  );
};

const SubscribeForm = (props: { publication: string }) => {
  let { identity } = useIdentityData();
  let [state, setState] = useState<State>(
    identity?.atp_did || identity?.email
      ? { state: "success" }
      : { state: "login" },
  );
  let [email, setEmail] = useState<string | undefined>(
    "thisiscelinepark@gmail.com",
  );
  let [emailInputValue, setEmailInputValue] = useState("");

  if (state.state === "login")
    return (
      <div className="place-self-center justify-center flex flex-col gap-2 py-1  w-full">
        <EmailInput
          publication={props.publication}
          state={state}
          setState={setState}
          emailInputValue={emailInputValue}
          setEmailInputValue={setEmailInputValue}
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
          <ButtonSecondary fullWidth>
            <BlueskyTiny />
            Subscribe with Bluesky
          </ButtonSecondary>
          <button className="text-accent-contrast text-sm">
            or use an ATProto Handle
          </button>
        </div>
      </div>
    );
  if (state.state === "email") {
    return (
      <div className="text-center flex flex-col gap-1 py-1">
        <h4 className="text-secondary">Choose a new email</h4>
        <EmailInput
          state={state}
          setState={setState}
          emailInputValue={emailInputValue}
          setEmailInputValue={setEmailInputValue}
          publication={props.publication}
        />
      </div>
    );
  }
  if (state.state === "code")
    return (
      <div className=" flex flex-col gap-2 py-1 text-center justify-center text-secondary">
        <div className="flex flex-col">
          <div>Please enter the code sent to </div>
          <div className="italic">{emailInputValue}</div>
        </div>
        <ConfirmCode
          publication={props.publication}
          state={state}
          setState={setState}
          emailInputValue={emailInputValue}
          token={state.token}
        />
      </div>
    );
  if (state.state === "success") {
    return (
      <div className="subscribeSuccess flex flex-col text-center justify-normal py-1">
        <div className="bg-test h-12 w-16 mx-auto" />
        <h3 className="pt-1">Subscribed!</h3>
        {email ? (
          <>
            <div className="pt-2 pb-1 text-secondary text-sm">
              <div>You'll receive updates at </div>
              <div className=" italic">{email}</div>
            </div>
            <button
              className="text-sm text-accent-contrast"
              onClick={() => setState({ state: "email" })}
            >
              Edit email
            </button>
          </>
        ) : (
          <>
            <div className="pt-2 pb-1 text-secondary"> Get email updates</div>
            <EmailInput
              publication={props.publication}
              state={state}
              setState={setState}
              emailInputValue={emailInputValue}
              setEmailInputValue={setEmailInputValue}
            />
          </>
        )}
      </div>
    );
  }
};

const EmailInput = (props: {
  state: State;
  setState: (state: State) => void;
  publication: string;
  emailInputValue: string;
  setEmailInputValue: (value: string) => void;
}) => {
  let { identity, mutate } = useIdentityData();
  async function submit() {
    if (identity?.email) {
      await subscribeToPublicationWithEmail(props.publication);
      //optimistically could add!
      await mutate();
      return;
    }
    let tokenID = await requestAuthEmailToken(props.emailInputValue);
    props.setState({ state: "code", token: tokenID });
  }
  return (
    <div className="subscribeEmailInput flex gap-1 relative">
      <Input
        type="email"
        className="input-with-border !w-full !pr-[36px]"
        placeholder="me@email.com"
        value={props.emailInputValue}
        onChange={(e) => props.setEmailInputValue(e.target.value)}
      />
      <ButtonPrimary
        compact
        className="absolute right-1 top-1 !h-[22px] !w-[22px] !outline-0 "
        onClick={submit}
      >
        <ArrowRightTiny />
      </ButtonPrimary>
    </div>
  );
};

const ConfirmCode = (props: {
  state: State;
  setState: (state: State) => void;
  publication: string;
  emailInputValue: string;
  token: string;
}) => {
  let { mutate } = useIdentityData();
  let [codeInputValue, setCodeInputValue] = useState("");

  async function submit() {
    console.log(await confirmEmailAuthToken(props.token, codeInputValue));

    await subscribeToPublicationWithEmail(props.publication);
    //optimistically could add!
    await mutate();
    props.setState({ state: "success" });
    return;
  }

  return (
    <div className="subscribeEmailCodeInput flex gap-1 mx-auto relative">
      <Input
        type="number"
        className="input-with-border !pr-[88px] !py-1 max-w-[156px]"
        placeholder="000000"
        value={codeInputValue}
        onChange={(e) => setCodeInputValue(e.target.value)}
      />
      <ButtonPrimary
        compact
        className="absolute right-1 top-1 !outline-0"
        onClick={submit}
      >
        Confirm
      </ButtonPrimary>
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
                Updates via Bluesky custom feed!
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
