"use client";
import { useIdentityData } from "./IdentityProvider";
import { Popover } from "./Popover";
import LoginForm from "app/login/LoginForm";
import { ButtonPrimary } from "./Buttons";
import { ActionButton } from "./ActionBar/ActionButton";
import { AccountSmall } from "./Icons/AccountSmall";
import { useIsMobile } from "src/hooks/isMobile";
import {
  AtmosphericHandleInfo,
  HandleInput,
} from "./Subscribe/HandleSubscribe";
import { EmailInput, EmailConfirm } from "./Subscribe/EmailSubscribe";
import { useState } from "react";
import { GoToArrow } from "./Icons/GoToArrow";
import { ToggleGroup } from "./ToggleGroup";
import { Modal } from "./Modal";
import { useToaster } from "./Toast";
import { InfoSmall } from "./Icons/InfoSmall";
import { HelpSmall } from "./Icons/HelpSmall";
import { HelpTiny } from "./Icons/HelpTiny";

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
      />
      {state === "log in" ? (
        <>
          <div className="flex justify-between">
            <h4>Log into the Atmosphere</h4>
            <AtmosphericHandleInfo trigger={<HelpTiny />} />
          </div>
          <HandleInput
            large
            action={<GoToArrow className="text-accent-contrast" />}
          />
          <hr className="border-border-light" />
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
          <h4>Log in with Email</h4>

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
          <hr className="border-border-light" />
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
        <>heckin make a bluesky account yo</>
      )}
      {/*<LoginForm text="Save your Leaflets and access them on multiple devices!" />*/}
    </Popover>
  );
}
