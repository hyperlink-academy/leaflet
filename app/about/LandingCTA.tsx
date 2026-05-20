"use client";
import Link from "next/link";
import { useState } from "react";
import { LoginModal } from "components/LoginButton";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { Input } from "components/Input";

export function LandingCTA() {
  let [loginOpen, setLoginOpen] = useState(false);
  return (
    <div className="flex items-center justify-end gap-4 sm:gap-6">
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
      <Link href="/new" className="no-underline!">
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
        <ButtonPrimary className="rounded-lg! text-xl! bg-[#57822B]! border-[#57822B]! hover:outline-[#57822B]! text-white! py-1 ! px-4! mx-auto mt-3">
          Get Started!
        </ButtonPrimary>
      </div>
      <h4 className="pt-6 text-center">Pssst… Are you stuck on Substack?</h4>
      <p className="text-[1.25rem]! text-center text-secondary">
        Join the waitlist for our migration tools!
      </p>
      <div className="w-fit relative mx-auto">
        <Input
          type="email"
          placeholder="your@email.com"
          className="mx-auto mt-3 px-2! input-with-border text-[1.25rem]! max-w-full w-md"
        />
        <ButtonSecondary className="absolute top-[17px] right-1.5 py-0! border-[#57822B]!  text-[#57822B]!  hover:outline-[#57822B]!">
          Join
        </ButtonSecondary>
      </div>
    </>
  );
};
