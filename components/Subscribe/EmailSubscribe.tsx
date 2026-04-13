"use client";
import * as OneTimePasswordField from "@radix-ui/react-one-time-password-field";
import { ButtonPrimary } from "components/Buttons";
import { Input } from "components/Input";

export const EmailInput = (props: {
  action: React.ReactNode;
  autoFocus?: boolean;
  large?: boolean;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) => {
  return (
    <div
      className={` input-with-border flex gap-2 w-full items-center mx-auto py-0! ${props.large && "px-2!"}`}
    >
      <Input
        autoFocus={props.autoFocus}
        className={`appearance-none! outline-none! grow ${props.large ? "py-2!" : "py-0.5 "}`}
        disabled={props.disabled}
        placeholder="email@example.com"
        size={0}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <div className={` text-accent-contrast flex items-center shrink-0 `}>
        {props.action}
      </div>
    </div>
  );
};

export const EmailConfirm = (props: {
  emailValue: string;
  onSubmit: () => void;
}) => {
  let inputClassName = "input-with-border text-2xl w-8 h-12 text-center";
  return (
    <div className="flex flex-col text-center max-w-sm pb-2">
      <h3>Confirm your email</h3>
      Enter the confirmation code sent to <br />
      <div className="italic min-w-0 truncate">{props.emailValue}</div>
      <OneTimePasswordField.Root
        autoSubmit
        validationType="alphanumeric"
        onAutoSubmit={() => {
          props.onSubmit();
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
