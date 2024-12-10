"use client";
import { useState } from "react";
//@ts-ignore
import Terms from "./terms.mdx";
//@ts-ignore
import Privacy from "./privacy.mdx";

export const LegalContent = () => {
  let [state, setState] = useState<"terms" | "privacy">("terms");
  return (
    <div className="flex flex-col h-screen mx-auto sm:px-4 px-3 sm:py-6 py-4 max-w-prose">
      <h1 className="pb-4 ">The Legal Stuff</h1>
      <div className="flex flex-row gap-2 z-10">
        <button
          onClick={() => {
            setState("terms");
          }}
          className={`rounded-t-md border border-border px-3 py-1 ${state === "terms" ? "border-b-bg-page font-bold bg-bg-page" : "border bg-bg-leaflet text-tertiary"}`}
        >
          Terms of Service
        </button>
        <button
          onClick={() => {
            setState("privacy");
          }}
          className={`rounded-t-md border border-border px-3 py-1 ${state === "privacy" ? "border-b-bg-page font-bold bg-bg-page" : "border text-tertiary"}`}
        >
          Privacy Policy
        </button>
      </div>
      <div
        className={`no-scrollbar border border-border rounded-md bg-bg-page sm:px-4 px-3 pt-2 pb-6  -mt-[1px] h-full overflow-y-scroll rounded-tl-none `}
      >
        {state === "terms" ? <Terms /> : <Privacy />}
      </div>
    </div>
  );
};
