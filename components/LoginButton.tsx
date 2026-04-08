"use client";
import { useIdentityData } from "./IdentityProvider";
import { Popover } from "./Popover";
import LoginForm from "app/login/LoginForm";
import { ButtonPrimary } from "./Buttons";
import { ActionButton } from "./ActionBar/ActionButton";
import { AccountSmall } from "./Icons/AccountSmall";
import { useIsMobile } from "src/hooks/isMobile";
import { HandleInput } from "./Subscribe/HandleSubscribe";
import { EmailInput } from "./Subscribe/EmailSubscribe";
import { useState } from "react";
import { GoToArrow } from "./Icons/GoToArrow";
import { ToggleGroup } from "./ToggleGroup";

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
  return (
    <Popover
      asChild
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      className="flex flex-col gap-2"
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
          <h3>Atmospheric handle</h3>
          <HandleInput className="h-10!" action="login" />
          <hr className="border-border-light" />
          <button
            onClick={() => {
              setState("email log in");
            }}
          >
            log in with email
          </button>
        </>
      ) : state === "email log in" ? (
        <>
          <EmailInput action="login" />
          <hr className="border-border-light" />
          <button
            onClick={() => {
              setState("log in");
            }}
          >
            log in with atmosphere
          </button>
        </>
      ) : (
        <>heckin make a bluesky account yo</>
      )}
      {/*<LoginForm text="Save your Leaflets and access them on multiple devices!" />*/}
    </Popover>
  );
}
