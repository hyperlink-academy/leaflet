"use client";
import { logout } from "actions/logout";
import { useIdentityData } from "./IdentityProvider";
import { Popover } from "./Popover";
import LoginForm from "app/login/LoginForm";
import { ButtonPrimary } from "./Buttons";

export function LoginButton() {
  let identityData = useIdentityData();
  if (identityData.identity)
    return <button onClick={() => logout()}>logout</button>;
  return (
    <Popover trigger={<ButtonPrimary>Log In</ButtonPrimary>}>
      <LoginForm />
    </Popover>
  );
}
