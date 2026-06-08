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
import { Menu, RadioMenuGroup, RadioMenuItem } from "components/Menu";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import { Tooltip } from "components/Tooltip";

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
}) => {
  return (
    <div className="flex gap-1 w-full min-w-0">
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
    </div>
  );
};

// Compact one-click subscribe for a signed-in user. Defaults to their verified
// email — the request action takes the fast path (confirmed: true) so there's
// no code round-trip. If they also have an atproto handle, the caret opens an
// account menu (mirroring SubscribeModeMenu) to subscribe via Bluesky instead.
// Used by SubscribeButton in newsletter mode; the roomier inline equivalent is
// the logged-in EmailInput in SubscribeInput.
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
  let [account, setAccount] = useState<"email" | "atproto">("email");
  let hasMenu = !!props.handle;
  let isEmail = account === "email" || !props.handle;

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
    let url = new URL(window.location.href);
    url.searchParams.set("refreshAuth", "");
    let res = await subscribeToPublication(
      props.publicationUri,
      url.toString(),
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
    return true;
  };

  const subscribe = async () => {
    if (loading) return;
    setLoading(true);
    let ok = isEmail ? await subscribeEmail() : await subscribeAtproto();
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
      onClick={subscribe}
      className={`text-sm grow shrink! min-w-0 flex gap-2 items-center ${hasMenu ? "rounded-r-none! hover:outline-transparent! focus:outline-transparent!" : ""} ${props.compact ? "gap-1!" : ""}`}
    >
      {loading ? (
        <DotLoader />
      ) : (
        <>
          {isEmail ? <EmailTiny className="shrink-0" /> : avatar}
          <span className="shrink-0">
            Subscribe
            {!props.compact && (isEmail ? " with" : " as")}
          </span>
          {!props.compact && (
            <span className="truncate min-w-0">
              {isEmail ? props.email : `@${props.handle}`}
            </span>
          )}
        </>
      )}
    </ButtonPrimary>
  );

  return (
    <div className="flex gap-1 max-w-full w-fit min-w-0">
      <div
        className={`flex grow min-w-0 ${hasMenu ? "group rounded-md outline-2 outline-transparent outline-offset-1 hover:outline-accent-1 focus-within:outline-accent-1" : ""}`}
      >
        {props.compact ? (
          <Tooltip
            asChild
            delayDuration={0}
            side="top"
            trigger={subscribeButton}
            className="text-sm p-1! text-tertiary"
          >
            {isEmail ? props.email : `@${props.handle}`}
          </Tooltip>
        ) : (
          subscribeButton
        )}
        {hasMenu && (
          <Menu
            align="end"
            asChild
            className={props.compact ? "text-sm" : undefined}
            trigger={
              <ButtonPrimary
                compact={props.compact}
                disabled={loading}
                aria-label="Choose account"
                className={`rounded-l-none! border-l-accent-2! py-0! h-full! hover:outline-transparent! focus:outline-transparent! active:outline-transparent! ${props.compact ? "px-0.5!" : "px-1!"} `}
              >
                <ArrowDownTiny />
              </ButtonPrimary>
            }
          >
            <div className="text-tertiary text-sm px-1 pt-0.5 ">
              Subscribe with…
            </div>
            <RadioMenuGroup
              value={account}
              onValueChange={(v) => setAccount(v as "email" | "atproto")}
            >
              <RadioMenuItem
                className="py-0.5! font-normal!"
                value="email"
                selected={isEmail}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <EmailTiny />
                  <span className="truncate">{props.email}</span>
                </span>
              </RadioMenuItem>
              <RadioMenuItem
                className="py-0.5! font-normal!"
                value="atproto"
                selected={!isEmail}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {avatar}
                  <span className="truncate">@{props.handle}</span>
                </span>
              </RadioMenuItem>
            </RadioMenuGroup>
          </Menu>
        )}
      </div>
      {props.publicationUrl && (
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
