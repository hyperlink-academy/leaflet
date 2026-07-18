"use client";
import { useIdentityData } from "./IdentityProvider";
import { Popover } from "./Popover";
import { Modal } from "./Modal";

import { ButtonPrimary } from "./Buttons";
import { ActionButton } from "./ActionBar/ActionButton";
import { AccountSmall } from "./Icons/AccountSmall";
import { AtmosphericHandleInfo } from "./Subscribe/HandleSubscribe";
import { HandleInput } from "./Subscribe/HandleInput";
import { EmailInput, EmailConfirm } from "./Subscribe/EmailSubscribe";
import { useState } from "react";
import { GoToArrow } from "./Icons/GoToArrow";
import { ToggleGroup } from "./ToggleGroup";
import { useToaster } from "./Toast";
import { BlueskyTiny } from "./Icons/BlueskyTiny";
import {
  requestAuthEmailToken,
  confirmEmailAuthToken,
} from "actions/emailAuth";
import { loginWithEmailToken } from "actions/login";
import { getHomeDocs } from "app/(app)/(home-pages)/(writer)/home/storage";
import { mutate } from "swr";
import { buildOauthLoginUrl, mainSiteAuthBase } from "src/utils/customDomain";

export const LoginModal = (props: {
  noEmailLogin?: boolean;
  trigger?: React.ReactNode;
  asChild?: boolean;
  redirectRoute?: string;
  // Already-encoded after-sign-in action (encodeActionToSearchParam) to run
  // once the oauth flow completes, e.g. recommend the post that prompted login.
  action?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  let [internalOpen, setInternalOpen] = useState(false);
  let isControlled = props.open !== undefined;
  let open = props.open ?? internalOpen;
  let setOpen = (o: boolean) => {
    if (!isControlled) setInternalOpen(o);
    props.onOpenChange?.(o);
  };
  return (
    <Modal
      asChild={props.asChild}
      trigger={props.trigger}
      open={open}
      onOpenChange={setOpen}
      className="w-full!"
    >
      <LoginContent
        noEmailLogin={props.noEmailLogin}
        redirectRoute={props.redirectRoute}
        action={props.action}
        open={open}
        onSuccess={() => setOpen(false)}
      />
    </Modal>
  );
};

export const LoginContent = (props: {
  pageView?: boolean;
  noEmailLogin?: boolean;
  redirectRoute?: string;
  action?: string;
  open?: boolean;
  onSuccess?: () => void;
  className?: string;
  // Logging into an additional account from the switcher while a session is
  // still active: render the normal login form (not the link/merge prompts)
  // and keep the new session fully separate from the current identity.
  addAccount?: boolean;
}) => {
  let identityData = useIdentityData();
  let [state, setState] = useState<
    "log in" | "sign up" | "email log in" | "email confirm"
  >("log in");
  let [loginEmail, setLoginEmail] = useState("");
  let [tokenId, setTokenId] = useState<string | null>(null);
  let [loading, setLoading] = useState(false);
  let toaster = useToaster();

  if (!props.addAccount) {
    if (identityData.identity?.atp_did) return null;
    if (identityData.identity?.email && !identityData.identity.atp_did) {
      return (
        <LinkAtmosphereContent
          pageView={props.pageView}
          redirectRoute={props.redirectRoute}
          action={props.action}
          open={props.open}
        />
      );
    }
  }

  const handleEmailSubmit = async () => {
    setLoading(true);
    try {
      // On a custom domain, complete email auth on the main site: it checks for
      // an existing session and hands it back if found, otherwise it emails a
      // code and collects it there before bouncing back. This keeps the
      // canonical session first-party on the main site.
      let base = mainSiteAuthBase();
      if (base) {
        let loginUrl = new URL("/api/auth/email-login", base);
        loginUrl.searchParams.set("email", loginEmail);
        loginUrl.searchParams.set("redirect", window.location.href);
        window.location.href = loginUrl.toString();
        return;
      }
      const id = await requestAuthEmailToken(loginEmail);
      setTokenId(id);
      setState("email confirm");
    } catch (e) {
      toaster({
        content: (
          <div className="font-bold">
            We couldnt send the email. Please try again!
          </div>
        ),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (code: string) => {
    if (!tokenId) return;
    setLoading(true);
    const confirmedToken = await confirmEmailAuthToken(tokenId, code);
    if (!confirmedToken) {
      setLoading(false);
      toaster({
        content: <div className="font-bold">Incorrect code!</div>,
        type: "error",
      });
      return;
    }
    // Local pre-login drafts belong to whoever first signs in on this browser,
    // never to an additional account added alongside an existing session.
    const localLeaflets = props.addAccount
      ? []
      : getHomeDocs().filter((l) => !l.hidden);
    await loginWithEmailToken(localLeaflets, props.redirectRoute);
    if (props.addAccount) {
      // The session cookie now points at the added account; navigate rather
      // than mutate in place since page state is keyed to the old identity.
      window.location.href = "/home";
      return;
    }
    mutate("identity");
    toaster({
      content: <div className="font-bold">Logged in! Welcome!</div>,
      type: "success",
    });
    setLoading(false);
    props.onSuccess?.();
  };

  return (
    <div className={`flex flex-col gap-2 w-full sm:w-xs ${props.className}`}>
      <ToggleGroup
        value={
          state === "email log in" || state === "email confirm"
            ? "log in"
            : state
        }
        onChange={setState}
        options={[
          { value: "log in", label: "Log In" },
          { value: "sign up", label: "Sign Up" },
        ]}
        fullWidth
      />
      <div
        className={`accent-container flex flex-col gap-1 ${props.pageView ? " p-4 py-5" : "px-3 py-4  "}`}
      >
        {state === "log in" ? (
          <>
            <div className="flex flex-col gap-1 text-center mx-auto leading-tight pb-2">
              <h3>
                Log in with <br />
                Atmosphere account
              </h3>
              <AtmosphericHandleInfo
                trigger={
                  <div className="text-sm text-accent-contrast">
                    What's the Atmosphere?
                  </div>
                }
              />
            </div>
            <HandleInput
              large
              autoFocus={props.open !== false}
              action={<GoToArrow className="text-accent-contrast" />}
              loading={loading}
              onSubmit={(handle) => {
                setLoading(true);
                window.location.href = buildOauthLoginUrl({
                  handle,
                  redirect: props.redirectRoute || window.location.href,
                  action: props.action,
                  addAccount: props.addAccount,
                });
              }}
            />
            {props.noEmailLogin ? null : (
              <>
                <hr className="border-border-light mt-2 mb-1" />
                <button
                  className="text-sm text-accent-contrast"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setState("email log in");
                  }}
                >
                  or log in with email
                </button>
              </>
            )}
          </>
        ) : state === "email log in" ? (
          <form
            className="flex flex-col gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleEmailSubmit();
            }}
          >
            <h3 className="text-center">Log in with Email</h3>

            <EmailInput
              large
              autoFocus={props.open !== false}
              value={loginEmail}
              onChange={setLoginEmail}
              loading={loading}
              action={
                <button
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleEmailSubmit();
                  }}
                >
                  <GoToArrow className="h-fit" />
                </button>
              }
            />
            <hr className="border-border-light my-2" />
            <button
              type="button"
              className="text-accent-contrast text-sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setState("log in");
              }}
            >
              or log in with Atmosphere account
            </button>
          </form>
        ) : state === "email confirm" ? (
          <EmailConfirm
            autoFocus={props.open !== false}
            emailValue={loginEmail}
            loading={loading}
            onSubmit={handleCodeSubmit}
            onBack={() => setState("email log in")}
          />
        ) : (
          <div className="text-center text-sm">
            <h3 className="pb-1">
              Leaflet is part of <br />
              the Atmosphere.
            </h3>
            <div className="text-secondary pb-3">
              Create an Atmosphere account on Bluesky to get started!
            </div>
            <ButtonPrimary
              className="mx-auto mb-1"
              onClick={() => {
                window.location.href = buildOauthLoginUrl({
                  redirect: props.redirectRoute || "/",
                  signup: true,
                  action: props.action,
                  addAccount: props.addAccount,
                });
              }}
            >
              <BlueskyTiny /> Sign up via Bluesky
            </ButtonPrimary>
            <AtmosphericHandleInfo />
          </div>
        )}
      </div>
    </div>
  );
};

const LinkAtmosphereContent = (props: {
  pageView?: boolean;
  redirectRoute?: string;
  action?: string;
  open?: boolean;
}) => {
  let [loading, setLoading] = useState(false);
  return (
    <div
      className={`accent-container w-xs flex flex-col gap-1 ${props.pageView ? " p-4 py-5" : "px-3 py-4  "}`}
    >
      <div className="flex flex-col gap-1 text-center mx-auto leading-tight pb-2">
        <h3>
          Link your <br />
          Atmosphere account
        </h3>
        <AtmosphericHandleInfo
          trigger={
            <div className="text-sm text-accent-contrast">
              What's the Atmosphere?
            </div>
          }
        />
      </div>
      <HandleInput
        large
        autoFocus={props.open !== false}
        action={<GoToArrow className="text-accent-contrast" />}
        loading={loading}
        onSubmit={(handle) => {
          setLoading(true);
          window.location.href = buildOauthLoginUrl({
            handle,
            redirect: props.redirectRoute || window.location.href,
            action: props.action,
            link: true,
          });
        }}
      />
      <hr className="border-border-light mt-2 mb-1" />
      <button
        type="button"
        className="text-sm text-accent-contrast flex gap-1 items-center mx-auto"
        onClick={() => {
          window.location.href = buildOauthLoginUrl({
            redirect: props.redirectRoute || "/",
            signup: true,
            action: props.action,
            link: true,
          });
        }}
      >
        <BlueskyTiny /> or sign up via Bluesky
      </button>
    </div>
  );
};
