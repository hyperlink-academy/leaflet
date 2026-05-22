"use client";
import Link from "next/link";
import { useState } from "react";
import { LoginModal } from "components/LoginButton";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { Input } from "components/Input";
import { useIdentityData } from "components/IdentityProvider";

export function LandingCTA() {
  let [loginOpen, setLoginOpen] = useState(false);
  let { identity } = useIdentityData();
  let signedIn = !!identity?.atp_did;
  return (
    <div className="flex items-center justify-end gap-4 sm:gap-6">
      {signedIn ? (
        <Link
          href="/home"
          className="text-[#57822B] font-bold text-lg! sm:text-xl! no-underline!"
        >
          Log in
        </Link>
      ) : (
        <>
          <button
            onClick={() => setLoginOpen(true)}
            className="text-[#57822B] font-bold text-lg! sm:text-xl!"
          >
            Log in
          </button>
          <LoginModal
            open={loginOpen}
            onOpenChange={setLoginOpen}
            redirectRoute="/home"
          />
        </>
      )}
      <Link href="/new?welcomeModal" prefetch={false} className="no-underline!">
        <ButtonPrimary className="rounded-lg! text-lg! sm:text-xl! bg-[#57822B]! border-[#57822B]! hover:outline-[#57822B]! text-white! py-0.5! px-2! sm:py-1 ! sm:px-4!">
          Start Writing
        </ButtonPrimary>
      </Link>
    </div>
  );
}

export const LandingCTABottom = () => {
  return (
    <>
      <div className="bg-[#D3DDC6] text-center flex flex-col justify-center mt-24 pt-8 pb-10 rounded-lg!">
        <h3>Write with Leaflet!</h3>
        <Link
          href="/new?welcomeModal"
          prefetch={false}
          className="no-underline! mx-auto mt-2 md:mt-4"
        >
          <ButtonPrimary className="rounded-lg! text-lg! md:text-xl! bg-[#57822B]! border-[#57822B]! hover:outline-[#57822B]! text-white! py-0.5! px-2! sm:py-1 ! sm:px-4!">
            Get Started!
          </ButtonPrimary>
        </Link>
      </div>
    </>
  );
};
