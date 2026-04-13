"use client";
import { useIdentityData } from "./IdentityProvider";
import { Popover } from "./Popover";
import { Modal } from "./Modal";
import LoginForm from "app/login/LoginForm";
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
import { getHomeDocs } from "app/(home-pages)/home/storage";
import { mutate } from "swr";

export function LoginButton() {
  let identityData = useIdentityData();
  if (identityData.identity) return null;
  return (
    <Popover
      asChild
      trigger={
        <ButtonPrimary className="place-self-start text-sm">
          Log In!
        </ButtonPrimary>
      }
    >
      <LoginForm text="Save your Leaflets and access them on multiple devices!" />
    </Popover>
  );
}

export function LoginActionButton() {
  let identityData = useIdentityData();
  if (identityData.identity) return null;
  let [state, setState] = useState<
    "log in" | "sign up" | "email log in" | "email confirm"
  >("log in");
  let [loginEmail, setLoginEmail] = useState("");
  let [tokenId, setTokenId] = useState<string | null>(null);
  let [loading, setLoading] = useState(false);
  let toaster = useToaster();

  const handleEmailSubmit = async () => {
    setLoading(true);
    const id = await requestAuthEmailToken(loginEmail);
    setLoading(false);
    setTokenId(id);
    setState("email confirm");
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
    } else {
      const localLeaflets = getHomeDocs();
      await loginWithEmailToken(localLeaflets.filter((l) => !l.hidden));
      mutate("identity");
    }
  };
  return (
    <Modal
      asChild
      trigger={
        <ActionButton
          secondary
          icon={<AccountSmall />}
          label="Log In/Sign Up"
        />
      }
    >
      <div className="flex flex-col gap-2 w-xs">
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
        <div className="accent-container flex flex-col gap-1 p-3 pt-4">
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
                      What's that?
                    </div>
                  }
                />
              </div>
              <HandleInput
                large
                action={<GoToArrow className="text-accent-contrast" />}
                loading={loading}
                onSubmit={(handle) => {
                  setLoading(true);
                  window.location.href = `/api/oauth/login?handle=${encodeURIComponent(handle)}&redirect_url=/`;
                }}
              />
              <hr className="border-border-light mt-2 mb-1" />
              <button
                className="text-sm text-accent-contrast"
                onClick={() => {
                  setState("email log in");
                }}
              >
                or log in with email
              </button>
            </>
          ) : state === "email log in" ? (
            <form
              className="flex flex-col gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                handleEmailSubmit();
              }}
            >
              <h3 className="text-center">Log in with Email</h3>

              <EmailInput
                large
                value={loginEmail}
                onChange={setLoginEmail}
                loading={loading}
                action={
                  <button type="submit">
                    <GoToArrow className="h-fit" />
                  </button>
                }
              />
              <hr className="border-border-light my-2" />
              <button
                type="button"
                className="text-accent-contrast text-sm"
                onClick={() => {
                  setState("log in");
                }}
              >
                or log in with Atmosphere account
              </button>
            </form>
          ) : state === "email confirm" ? (
            <EmailConfirm
              emailValue={loginEmail}
              loading={loading}
              onSubmit={handleCodeSubmit}
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
              <ButtonPrimary className="mx-auto mb-1">
                <BlueskyTiny /> Sign up via Bluesky
              </ButtonPrimary>
              <AtmosphericHandleInfo />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
