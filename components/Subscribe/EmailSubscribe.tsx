"use client";
import * as OneTimePasswordField from "@radix-ui/react-one-time-password-field";
import { ButtonPrimary } from "components/Buttons";
import { Input } from "components/Input";
import { DotLoader } from "components/utils/DotLoader";
import { theme } from "tailwind.config";

export const EmailInput = (props: {
  action: React.ReactNode;
  autoFocus?: boolean;
  large?: boolean;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  loading?: boolean;
}) => {
  return (
    <div
      className={` input-with-border flex gap-2 w-full items-center mx-auto py-0! ${props.large && "px-2!"} `}
      style={
        props.loading
          ? {
              backgroundColor: theme.colors["border-light"],
              color: theme.colors.tertiary,
            }
          : {
              backgroundColor: theme.colors["bg-page"],
              color: theme.colors.primary,
            }
      }
    >
      <Input
        autoFocus={props.autoFocus}
        className={`appearance-none! outline-none! grow ${props.large ? "py-1!" : "py-0.5 "}`}
        disabled={props.disabled || props.loading}
        placeholder="email@example.com"
        size={0}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <div className={` text-accent-contrast flex items-center shrink-0 `}>
        {props.loading ? <DotLoader /> : props.action}
      </div>
    </div>
  );
};

export const EmailConfirm = (props: {
  emailValue: string;
  autoFocus?: boolean;
  loading?: boolean;
  onSubmit: (code: string) => void;
}) => {
  let inputClassName = `input-with-border text-2xl w-8 h-12 text-center ${props.loading ? "bg-border-light! text-tertiary!" : ""}`;
  return (
    <div className="flex flex-col text-center max-w-sm pb-2 text-secondary leading-snug">
      <h3>Confirm your email</h3>
      Enter the code sent to <br />
      <div className="italic min-w-0 truncate">{props.emailValue}</div>
      <OneTimePasswordField.Root
        autoSubmit
        autoFocus={props.autoFocus}
        validationType="alphanumeric"
        onAutoSubmit={(value) => {
          props.onSubmit(value);
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
