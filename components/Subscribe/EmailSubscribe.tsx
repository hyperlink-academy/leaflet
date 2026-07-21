"use client";
import * as OneTimePasswordField from "@radix-ui/react-one-time-password-field";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { RSSTiny } from "components/Icons/RSSTiny";
import { Input } from "components/Input";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import { requestPublicationEmailSubscription } from "actions/publications/subscribeEmail";
import { subscribeToPublication } from "app/(app)/lish/subscribeToPublication";
import { isOAuthSessionError, OAuthErrorMessage } from "components/OAuthError";
import { SUBSCRIBE_ERROR_MESSAGES } from "./subscribeErrors";
import { onMouseDown as iosOnPointerDown } from "src/utils/iosInputMouseDown";
import { theme } from "tailwind.config";
import { EmailTiny } from "components/Icons/EmailTiny";
import { Avatar } from "components/Avatar";
import { useIdentityData } from "components/IdentityProvider";
import { useRecordFromDid } from "src/utils/useRecordFromDid";
import { Tooltip } from "components/Tooltip";
import { SubscribeButtonModeMenu } from "./SubscribeButton";

export const EmailInput = (props: {
  action: React.ReactNode;
  leading?: React.ReactNode;
  autoFocus?: boolean;
  large?: boolean;
  compact?: boolean;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  loading?: boolean;
  publicationUrl?: string;
  // When set, the input is wrapped in a form so Enter submits. Callers that
  // provide their own outer form (e.g. LoginButton) should omit this.
  onSubmit?: () => void;
}) => {
  let content = (
    <>
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
          className={`appearance-none! outline-none! grow min-w-0 ${props.large ? "py-1!" : `${props.compact ? "py-0!" : "py-0.5"} disabled:text-tertiary disabled:italic disabled:border-border-light`}`}
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
          <ButtonSecondary
            className={`${props.compact ? "p-[3px]!" : "p-[6px]!"} border-border!`}
          >
            <RSSTiny />
          </ButtonSecondary>
        </a>
      )}
    </>
  );
  return props.onSubmit ? (
    <form
      className="flex gap-1 w-full min-w-0"
      onSubmit={(e) => {
        e.preventDefault();
        props.onSubmit?.();
      }}
    >
      {content}
    </form>
  ) : (
    <div className="flex gap-1 w-full min-w-0">{content}</div>
  );
};

export const EmailButton = (props: {
  publicationUri: string;
  publicationUrl?: string;
  email: string;
  handle?: string;
  compact?: boolean;
  onSubscribed?: () => void;
}) => {
  let toaster = useToaster();
  let router = useRouter();
  let { identity } = useIdentityData();
  let { data: record } = useRecordFromDid(identity?.atp_did);
  let [loading, setLoading] = useState(false);
  let hasModeMenu = props.compact || props.handle;
  // The main button always subscribes via email; the atproto handle is offered
  // as a one-click alternate in the dropdown.
  let tooltipLabel = props.email || null;

  const avatar = (
    <Avatar
      size="tiny"
      src={record?.avatar}
      displayName={record?.displayName || record?.handle}
    />
  );

  const subscribeEmail = async () => {
    let res = await requestPublicationEmailSubscription(
      props.publicationUri,
      props.email,
    );
    if (!res.ok) {
      toaster({ type: "error", content: SUBSCRIBE_ERROR_MESSAGES[res.error] });
      return false;
    }
    return true;
  };

  const subscribeAtproto = async () => {
    let res = await subscribeToPublication(
      props.publicationUri,
      window.location.href,
    );
    if (!res.success) {
      toaster({
        type: "error",
        content: isOAuthSessionError(res.error) ? (
          <OAuthErrorMessage error={res.error} />
        ) : (
          "We couldn't subscribe you. Try again."
        ),
      });
      return false;
    }
    if (res.joinUrl) {
      // Memberships enabled — go pick a tier instead of the success toast.
      window.location.href = res.joinUrl;
      return null;
    }
    return true;
  };

  const subscribe = async (mode: "email" | "atproto") => {
    if (loading) return;
    setLoading(true);
    let ok =
      mode === "email" ? await subscribeEmail() : await subscribeAtproto();
    setLoading(false);
    if (!ok) return;
    toaster({ content: <div>You're Subscribed!</div>, type: "success" });
    props.onSubscribed?.();
    router.refresh();
  };

  const subscribeButton = (
    <ButtonPrimary
      compact={props.compact}
      disabled={loading}
      onClick={() => subscribe("email")}
      className={`text-sm grow shrink! min-w-0 flex gap-2 items-center ${hasModeMenu ? "gap-1! rounded-r-none! hover:outline-transparent! focus:outline-transparent!" : ""} `}
    >
      {loading ? (
        <DotLoader />
      ) : (
        <>
          <EmailTiny className="shrink-0" />
          <span className={`shrink-0`}> Subscribe</span>{" "}
          <span className={`truncate min-w-0 ${props.compact && "hidden"}`}>
            with {props.email}
          </span>
        </>
      )}
    </ButtonPrimary>
  );

  return (
    <div className="flex gap-1 max-w-full w-fit min-w-0">
      <div
        className={`flex grow min-w-0 ${props.compact ? "group rounded-md outline-2 outline-transparent outline-offset-1 hover:outline-accent-1 focus-within:outline-accent-1 shrink-0" : ""}`}
      >
        {props.compact && tooltipLabel ? (
          <Tooltip
            asChild
            delayDuration={0}
            side="top"
            trigger={subscribeButton}
            className="text-sm p-1! text-tertiary"
          >
            {tooltipLabel}
          </Tooltip>
        ) : (
          subscribeButton
        )}
        {hasModeMenu ? (
          <SubscribeButtonModeMenu
            disabled={loading}
            publicationUrl={props.publicationUrl}
            accounts={[
              {
                value: "email",
                label: props.email,
                icon: <EmailTiny />,
                selected: true,
                onSelect: () => subscribe("email"),
              },
              ...(props.handle
                ? [
                    {
                      value: "atproto" as const,
                      label: `@${props.handle}`,
                      icon: avatar,
                      selected: false,
                      onSelect: () => subscribe("atproto"),
                    },
                  ]
                : []),
            ]}
          />
        ) : null}
      </div>
      {!props.compact && (
        <a
          href={`${props.publicationUrl}/rss`}
          target="_blank"
          rel="noopener noreferrer"
          className={`no-underline shrink-0 ${props.compact ? "w-6" : "w-7"}`}
        >
          <ButtonPrimary className="h-full! w-auto! py-0! px-0! aspect-square">
            <RSSTiny />
          </ButtonPrimary>
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
