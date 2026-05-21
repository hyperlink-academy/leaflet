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
      <Link href="/new?welcomeModal" className="no-underline!">
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
        <ButtonPrimary className="rounded-lg! text-lg! md:text-xl! bg-[#57822B]! border-[#57822B]! hover:outline-[#57822B]! text-white! py-0.5! px-2! sm:py-1 ! sm:px-4! mx-auto mt-2 md:mt-4">
          Get Started!
        </ButtonPrimary>
      </div>
      <h4 className="pt-6 text-center">Pssst… Are you stuck on Substack?</h4>
      <p className=" text-center text-secondary">
        Join the waitlist for our migration tools!
      </p>
      <div className="w-fit relative mx-auto">
        <Input
          type="email"
          placeholder="your@email.com"
          className="mx-auto mt-3 pl-2! pr-14! input-with-border text-[1rem] sm:text-[1.25rem]! w-full sm:w-[1000px] sm:max-w-md "
        />
        <ButtonSecondary className="absolute top-[15px]  text-[.9rem]! sm:text-[1.125rem]! right-1 py-0! border-[#57822B]!  text-[#57822B]!  hover:outline-[#57822B]!">
          Join
        </ButtonSecondary>
      </div>
    </>
  );
};
