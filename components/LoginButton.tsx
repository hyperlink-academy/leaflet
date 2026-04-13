"use client";
import { useIdentityData } from "./IdentityProvider";
import { Popover } from "./Popover";
import LoginForm from "app/login/LoginForm";
import { ButtonPrimary } from "./Buttons";
import { ActionButton } from "./ActionBar/ActionButton";
import { AccountSmall } from "./Icons/AccountSmall";
import { useIsMobile } from "src/hooks/isMobile";
import { AtmosphericHandleInfo } from "./Subscribe/HandleSubscribe";
import { HandleInput } from "./Subscribe/HandleInput";
import { EmailInput, EmailConfirm } from "./Subscribe/EmailSubscribe";
import { useState } from "react";
import { GoToArrow } from "./Icons/GoToArrow";
import { ToggleGroup } from "./ToggleGroup";
import { Modal } from "./Modal";
import { useToaster } from "./Toast";
import { InfoSmall } from "./Icons/InfoSmall";
import { HelpSmall } from "./Icons/HelpSmall";
import { HelpTiny } from "./Icons/HelpTiny";
import { BlueskyTiny } from "./Icons/BlueskyTiny";

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
  let isMobile = useIsMobile();
  let [state, setState] = useState<"log in" | "sign up" | "email log in">(
    "log in",
  );
  let [loginEmail, setLoginEmail] = useState("");
  let toaster = useToaster();
  return (
    <Popover
      asChild
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      className="flex flex-col gap-2 py-3! w-xs"
      trigger={
        <ActionButton secondary icon={<AccountSmall />} label="Sign In" />
      }
    >
      <ToggleGroup
        value={state === "email log in" ? "log in" : state}
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
            <div className="flex flex-col  mx-auto leading-snug pb-0.5">
              <h3>Log into the Atmosphere</h3>
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
          <>
            <h3 className="text-center">Log in with Email</h3>

            <EmailInput
              large
              value={loginEmail}
              onChange={setLoginEmail}
              action={
                <Modal
                  trigger={
                    <GoToArrow
                      className="h-fit
                "
                    />
                  }
                >
                  <EmailConfirm
                    emailValue={loginEmail}
                    onSubmit={() => {
                      toaster({
                        content: <div className="font-bold">Welcome back!</div>,
                        type: "success",
                      });
                    }}
                  />
                </Modal>
              }
            />
            <hr className="border-border-light my-2" />
            <button
              className="text-accent-contrast text-sm"
              onClick={() => {
                setState("log in");
              }}
            >
              or log in with the Atmosphere
            </button>
          </>
        ) : (
          <div className="text-center text-sm">
            <h3 className="pb-1">
              Leaflet is part of <br />
              the Atmosphere.
            </h3>
            <div className="text-secondary pb-2">
              Create an Atmosphere account on Bluesky to get started!
            </div>
            <ButtonPrimary className="mx-auto mb-1">
              <BlueskyTiny /> Sign up via Bluesky
            </ButtonPrimary>
            <AtmosphericHandleInfo />
          </div>
        )}
      </div>
      {/*<LoginForm text="Save your Leaflets and access them on multiple devices!" />*/}
    </Popover>
  );
}
