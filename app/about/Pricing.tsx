"use client";

import { ButtonPrimary } from "components/Buttons";
import { SaleSticker } from "components/SaleSticker";
import { ToggleGroup } from "components/ToggleGroup";
import Link from "next/link";
import { useState } from "react";

export const Pricing = () => {
  let [cadence, setCadence] = useState<"monthly" | "yearly">("yearly");

  return (
    <div className="aboutPricing mx-auto w-full text-center pt-24 sm:pt-32">
      <h2 className="pb-4">Pricing</h2>
      <ToggleGroup
        fullWidth
        className="bg-[#F1EDE5]! w-fill max-w-md mx-auto "
        selectedOptionClassName="bg-[#686153]! text-white!"
        optionClassName="text-[#969696]! text-[1rem] sm:text-[1.25rem]  "
        value={cadence}
        onChange={setCadence}
        options={[
          { value: "monthly", label: "Monthly" },
          { value: "yearly", label: "Yearly" },
        ]}
      />
      <div className="accent-container text-base py-3 px-3 mt-4 mb-14 md:mb-8 text-secondary gap-3 text-center leading-snug w-full sm:max-w-sm md:max-w-[800px] mx-auto">
        <h3 className="text-xl! leading-tight">25% off your first year! </h3>
        <div className="text-base font-normal!">
          Get your{" "}
          <a
            target="_blank"
            href="https://lab.leaflet.pub/3movr6hcegc2f"
            className="underline"
          >
            Summer Pass
          </a>{" "}
          today, <br className="sm:hidden" /> only available until July 31
        </div>
      </div>
      <div className="flex md:flex-row flex-col w-fit gap-8 justify-center mx-auto pt-3 items-stretch">
        <div className="relative flex flex-1 sm:w-[1000px] w-full sm:max-w-sm">
          <div className="absolute -top-22 sm:-top-24 md:-top-28 -left-14 sm:-left-16 md:-left-10 z-0">
            <img
              src="/about/free.webp"
              alt=""
              className="w-[240px] sm:w-[280px]"
            />
          </div>
          <div
            className="freeTier relative z-10 bg-white border  border-[#57822B]! rounded-lg py-4 px-5 flex-1 max-w-sm text-left h-full"
            style={{ boxShadow: "8px 12px 0 0 #D9EA72" }}
          >
            <h3 className="leading-tight text-center">Free</h3>
            <p className="text-[1rem]! text-center text-tertiary text-snug pb-3">
              Basic Leaflet is free for everyone
            </p>
            <a href="/new?welcomeModal" className="no-underline!">
              <ButtonPrimary
                fullWidth
                className=" bg-[#57822B]! border-[#57822B]! hover:outline-[#57822B]! text-white! text-[1rem] sm:text-[1.25rem]!"
              >
                Start Writing
              </ButtonPrimary>
            </a>
            <hr className="border-border-light" />

            <ul className=" text-[1rem] sm:text-[1.25rem]! flex flex-col gap-2 mt-3 text-secondary pb-3 pt-2">
              <li>Fast, powerful text editing</li>
              <hr className="border-border-light" />
              <li>Custom Themes and Domains</li>
              <hr className="border-border-light" />

              <li>Publication Pages and Nav</li>
              <hr className="border-border-light" />

              <li>Unlimited Pubs and Posts</li>
              <hr className="border-border-light" />

              <li>Subscriptions via Atmosphere</li>
              <hr className="border-border-light" />

              <li>Comments, Quoting, and Sharing</li>
            </ul>
          </div>
        </div>
        <div className="relative flex-1 sm:w-[1000px] w-full sm:max-w-sm">
          <div className="absolute -bottom-32 -right-10 sm:-bottom-22 sm:-right-38">
            <img
              src="/about/paid.webp"
              alt=""
              className="w-[180px] sm:w-[240px] "
            />
          </div>
          {cadence === "yearly" && (
            <SaleSticker className="absolute -top-6 -left-4  z-20" width={96} />
          )}
          <div
            className="paidTier bg-white border border-[#57822B]! rounded-lg py-4 px-5 flex-1 max-w-sm text-left h-full"
            style={{ boxShadow: "8px 12px 0 0 #D9EA72" }}
          >
            <h3 className="leading-tight text-center">
              {cadence === "yearly" ? (
                <div className="flex gap-2 items-baseline justify-center">
                  <div className="relative text-tertiary text-lg">
                    $120
                    <div className="-rotate-16 absolute h-0.5 top-3.5 -left-1 -right-1 bg-tertiary border-1" />
                  </div>
                  <div>$90/year</div>
                </div>
              ) : (
                "$12/month"
              )}
            </h3>
            <p className="text-[1rem]! text-center text-tertiary text-snug pb-3">
              Serious publishers, serious tools
            </p>
            <Link
              href={
                cadence === "yearly"
                  ? `/checkout/pro?cadence=year&coupon=AldrohMq`
                  : `/checkout/pro?cadence=month`
              }
              className="no-underline!"
            >
              <ButtonPrimary
                fullWidth
                className=" bg-[#57822B]! border-[#57822B]! hover:outline-[#57822B]! text-white! text-[1rem] sm:text-[1.25rem]!"
              >
                Get Pro
              </ButtonPrimary>
            </Link>

            <hr className="border-border-light" />

            <ul className="text-[1rem] sm:text-[1.25rem]! flex flex-col gap-2 mt-3 text-secondary">
              <li>Everything in Free</li>
              <hr className="border-border-light" />

              <li>
                <div>Analytics</div>
                <div className="text-tertiary text-base">
                  Subscribers, page views, referrers
                </div>
              </li>
              <hr className="border-border-light" />

              <li>
                <div>1k Email Subscribers</div>
                <div className="text-tertiary text-base">
                  $5/mo for every additional 1k
                </div>
              </li>
              <hr className="border-border-light" />
              <li>
                Group Publication{" "}
                <div className="text-tertiary text-base">
                  Invite unlimited collaborators
                </div>
              </li>

              <hr className="border-border-light" />
              <li>
                <div>Coming soon!</div>
                <div className="text-tertiary text-base">
                  Memberships, group publications, <br />
                  and more
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
