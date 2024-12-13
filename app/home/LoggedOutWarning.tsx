"use client";
import { useIdentityData } from "components/IdentityProvider";
import { LoginButton } from "components/LoginButton";

export const LoggedOutWarning = (props: {}) => {
  let { identity } = useIdentityData();
  if (identity) return null;
  return (
    <div
      className={`
      homeWarning  z-10 shrink-0
      bg-bg-page rounded-md
      absolute bottom-14 left-2 right-2
      sm:static sm:mr-1 sm:ml-6 sm:mt-6 border border-border-light`}
    >
      <div className="px-2 py-1 text-sm text-tertiary flex sm:flex-row flex-col sm:gap-4 gap-1 items-center sm:justify-between">
        <p className="font-bold">
          Log in to collect all your Leaflets and access them on multiple
          devices
        </p>
        <LoginButton />
      </div>
    </div>
  );
};
