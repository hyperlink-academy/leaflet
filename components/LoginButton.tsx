"use client";
import { logout } from "actions/logout";
import { useIdentityData } from "./IdentityProvider";
import { Popover } from "./Popover";
import LoginForm from "app/login/LoginForm";
import { ButtonPrimary } from "./Buttons";
import { ActionButton } from "./ActionBar/ActionButton";
import { AccountSmall } from "./Icons";

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
      <LoginForm />
    </Popover>
  );
}

export function LoginActionButton() {
  let identityData = useIdentityData();
  if (identityData.identity) return null;
  return (
    <Popover
      asChild
      trigger={
        <ActionButton secondary icon={<AccountSmall />} label="Sign In" />
      }
    >
      <LoginForm />
    </Popover>
  );
}
