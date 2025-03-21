"use client";
import { ButtonPrimary } from "components/Buttons";
import { ArrowRightTiny, ShareSmall } from "components/Icons";
import { useEffect, useState } from "react";
import { Input } from "components/Input";
import { useIdentityData } from "components/IdentityProvider";
import { SecondaryAuthTokenContextImpl } from "twilio/lib/rest/accounts/v1/secondaryAuthToken";
import {
  confirmEmailAuthToken,
  requestAuthEmailToken,
} from "actions/emailAuth";
import { subscribeToPublicationWithEmail } from "actions/subscribeToPublicationWithEmail";

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
