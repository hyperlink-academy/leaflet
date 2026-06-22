"use client";

import { ButtonPrimary } from "components/Buttons";
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
        className="bg-[#F1EDE5]! w-fill max-w-md mx-auto mb-16 md:mb-6"
        selectedOptionClassName="bg-[#686153]! text-white!"
        optionClassName="text-[#969696]! text-[1rem] sm:text-[1.25rem]  "
        value={cadence}
        onChange={setCadence}
        options={[
          { value: "monthly", label: "Monthly" },
          { value: "yearly", label: "Yearly" },
        ]}
      />
      <div className="flex md:flex-row flex-col w-fit gap-8 justify-center mx-auto pt-3 items-stretch">
        <div className="relative flex-1 sm:w-[1000px] w-full sm:max-w-sm">
          <div className="absolute -top-22 sm:-top-24 md:-top-28 -left-14 sm:-left-16 md:-left-10 z-0">
            <img
              src="/about/free.webp"
              alt=""
              className="w-[240px] sm:w-[280px]"
            />
          </div>
          <div
            className="relative z-10 bg-white border  border-[#57822B]! rounded-lg py-4 px-5 flex-1 max-w-sm text-left"
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
          <div
            className="bg-white border border-[#57822B]! rounded-lg py-4 px-5 flex-1 max-w-sm text-left h-full"
            style={{ boxShadow: "8px 12px 0 0 #D9EA72" }}
          >
            <h3 className="leading-tight text-center">
              {cadence === "yearly" ? "$120/year" : "$12/month"}
            </h3>
            <p className="text-[1rem]! text-center text-tertiary text-snug pb-3">
              Serious publishers, serious tools
            </p>
            <Link
              href={
                cadence === "yearly"
                  ? `/checkout/pro?cadence=year&coupon=SUMMER`
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
