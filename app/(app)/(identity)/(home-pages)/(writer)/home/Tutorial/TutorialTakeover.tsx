"use client";

import { useState } from "react";
import { ButtonPrimary } from "components/Buttons";

// Placeholder copy — the real onboarding steps land here later.
export function TutorialTakeover() {
  let [step, setStep] = useState<"welcome" | "create">("welcome");

  return (
    <div className="tutorialTakeover grow w-full flex flex-col items-center justify-center gap-4 text-center">
      {step === "welcome" ? (
        <>
          <h2>Welcome to Leaflet</h2>
          <ButtonPrimary onClick={() => setStep("create")}>Next</ButtonPrimary>
        </>
      ) : (
        <>
          <h2>Start a pub</h2>
          <h2>Start a doc</h2>
        </>
      )}
    </div>
  );
}
