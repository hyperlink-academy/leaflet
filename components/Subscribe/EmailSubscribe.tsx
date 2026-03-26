"use client";
import * as OneTimePasswordField from "@radix-ui/react-one-time-password-field";
import { ButtonPrimary } from "components/Buttons";
import { GoToArrow } from "components/Icons/GoToArrow";
import { Input } from "components/Input";
import { Modal } from "components/Modal";
import { useState } from "react";
import { HandleInputandOAuth, UniversalHandleInfo } from "./HandleSubscribe";

export const EmailSubscribe = (props: {
  autoFocus?: boolean;
  compact?: boolean;
  user: {
    loggedIn: boolean;
    email: string | undefined;
    handle: string | undefined;
  };
}) => {
  let [value, setValue] = useState(
    props.user.loggedIn && props.user.email ? props.user.email : "",
  );
  let [state, setState] = useState<"confirm" | "success">(
    props.user.loggedIn && props.user.email ? "success" : "confirm",
  );
  return (
    <div className="relative input-with-border flex gap-2 w-full items-center mx-auto">
      <Input
        autoFocus={props.autoFocus}
        className={`appearance-none! outline-none! w-full ${props.compact ? "pr-7" : "pr-22"} `}
        disabled={props.user.loggedIn}
        placeholder="email@example.com"
        size={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Modal
        asChild
        trigger={
          <div className="absolute top-0 bottom-0 right-[4px] flex items-center">
            {props.compact ? (
              <GoToArrow className="text-accent-contrast mr-0.5" />
            ) : (
              <ButtonPrimary
                compact
                className="leading-tight! outline-none! text-sm!"
              >
                Subscribe
              </ButtonPrimary>
            )}
          </div>
        }
      >
        {state === "success" ? (
          <EmailSubscribeSuccess
            email={props.user.email}
            handle={props.user.handle}
          />
        ) : (
          <EmailSubscribeConfirm
            emailInputValue={value}
            onSubmit={() => {
              setState("success");
            }}
          />
        )}
      </Modal>
    </div>
  );
};

const EmailSubscribeConfirm = (props: {
  emailInputValue: string;
  onSubmit: () => void;
}) => {
  let inputClassName = "input-with-border text-2xl w-8 h-12 text-center";
  return (
    <div className="flex flex-col text-center max-w-sm pb-2">
      <h3>Confirm your email</h3>
      Enter the confirmation code sent to <br />
      <div className="italic min-w-0 truncate">{props.emailInputValue}</div>
      <OneTimePasswordField.Root
        autoSubmit
        validationType="alphanumeric"
        onAutoSubmit={() => {
          props.onSubmit();
          console.log("hello?");
        }}
      >
        <div className="flex gap-1 pt-4 w-full justify-center">
          <OneTimePasswordField.Input className={inputClassName} />
          <OneTimePasswordField.Input className={inputClassName} />
          <OneTimePasswordField.Input className={inputClassName} />
          <OneTimePasswordField.Input className={inputClassName} />
          <OneTimePasswordField.Input className={inputClassName} />
          <OneTimePasswordField.Input className={inputClassName} />
        </div>
        <OneTimePasswordField.HiddenInput />
      </OneTimePasswordField.Root>
    </div>
  );
};

const EmailSubscribeSuccess = (props: {
  email: string | undefined;
  handle: string | undefined;
}) => {
  return (
    <div className="flex flex-col text-center justify-center p-4 text-secondary max-w-md">
      <h2 className="text-primary pb-1">You've Subscribed!</h2>
      You'll recieve new posts to <br />
      <span className="italic">{props.email ? props.email : "your email"}</span>
      {!props.handle && (
        <>
          <hr className="my-4 border-border-light" />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <h4>Link your universal handle</h4>
              <div>
                to comment, recommend, and see what your friends are reading
              </div>
              <UniversalHandleInfo />
            </div>
            <HandleInputandOAuth />
          </div>
        </>
      )}
    </div>
  );
};
