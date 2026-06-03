"use client";
import * as OneTimePasswordField from "@radix-ui/react-one-time-password-field";
import { ButtonSecondary } from "components/Buttons";
import { RSSTiny } from "components/Icons/RSSTiny";
import { Input } from "components/Input";
import { DotLoader } from "components/utils/DotLoader";
import { onMouseDown as iosOnPointerDown } from "src/utils/iosInputMouseDown";
import { theme } from "tailwind.config";

export const EmailInput = (props: {
  action: React.ReactNode;
  leading?: React.ReactNode;
  autoFocus?: boolean;
  large?: boolean;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  loading?: boolean;
  publicationUrl?: string;
}) => {
  return (
    <div className="flex gap-1 w-full">
      <div
        className={` input-with-border flex gap-2 w-full items-center mx-auto py-0! min-w-0 ${props.large && "px-2!"} `}
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
        {props.leading && (
          <div className="text-tertiary shrink-0 flex items-center">
            {props.leading}
          </div>
        )}
        <Input
          type="email"
          autoFocus={props.autoFocus}
          className={`appearance-none! outline-none! grow min-w-0 ${props.large ? "py-1!" : "py-0.5 disabled:text-tertiary disabled:italic disabled:border-border-light"}`}
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
      {props.publicationUrl && (
        <a
          href={`${props.publicationUrl}/rss`}
          target="_blank"
          rel="noopener noreferrer"
          className={`no-underlinetext-accent-contrast`}
        >
          <ButtonSecondary className="p-[6px]!  border-border!">
            <RSSTiny />
          </ButtonSecondary>
        </a>
      )}
    </div>
  );
};

export const EmailConfirm = (props: {
  emailValue: string;
  autoFocus?: boolean;
  loading?: boolean;
  onSubmit: (code: string) => void;
  onBack: () => void;
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
          <OneTimePasswordField.Input
            className={inputClassName}
            onPointerDown={iosOnPointerDown}
          />
          <OneTimePasswordField.Input
            className={inputClassName}
            onPointerDown={iosOnPointerDown}
          />
          <OneTimePasswordField.Input
            className={inputClassName}
            onPointerDown={iosOnPointerDown}
          />
          <OneTimePasswordField.Input
            className={inputClassName}
            onPointerDown={iosOnPointerDown}
          />
          <OneTimePasswordField.Input
            className={inputClassName}
            onPointerDown={iosOnPointerDown}
          />
          <OneTimePasswordField.Input
            className={inputClassName}
            onPointerDown={iosOnPointerDown}
          />
        </div>
        <OneTimePasswordField.HiddenInput />
      </OneTimePasswordField.Root>
      <button
        className="text-sm text-accent-contrast mt-1"
        onClick={() => props.onBack()}
      >
        Use a different email?
      </button>
    </div>
  );
};
