"use client";
import * as OneTimePasswordField from "@radix-ui/react-one-time-password-field";
import { ButtonPrimary } from "components/Buttons";

import { Input } from "components/Input";
import { Modal } from "components/Modal";
import { useState } from "react";
import { HandleInputandOAuth, UniversalHandleInfo } from "./HandleSubscribe";
import { EmailSubscribeSuccess } from "./EmailSubscribeSuccess";

export const EmailSubscribe = (props: {
  link?: boolean;
  autoFocus?: boolean;
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
        className={`appearance-none! outline-none! w-full pr-22 `}
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
            <ButtonPrimary
              compact
              className="leading-tight! outline-none! text-sm!"
            >
              {props.link ? "Link" : "Subscribe"}
            </ButtonPrimary>
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
