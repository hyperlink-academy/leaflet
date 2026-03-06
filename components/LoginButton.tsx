"use client";
import { useIdentityData } from "./IdentityProvider";
import { Popover } from "./Popover";
import LoginForm from "app/login/LoginForm";
import { ButtonPrimary } from "./Buttons";
import { ActionButton } from "./ActionBar/ActionButton";
import { AccountSmall } from "./Icons/AccountSmall";
import { useIsMobile } from "src/hooks/isMobile";

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
  return (
    <Popover
      asChild
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      trigger={
        <ActionButton secondary icon={<AccountSmall />} label="Sign In" />
      }
    >
      <LoginForm text="Save your Leaflets and access them on multiple devices!" />
    </Popover>
  );
}
