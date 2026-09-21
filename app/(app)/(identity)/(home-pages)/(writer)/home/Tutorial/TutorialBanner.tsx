"use client";

import { ButtonSecondary } from "components/Buttons";
import { useTutorial } from "./useTutorial";

// Placeholder copy — the real onboarding content lands here later.
export function TutorialBanner() {
  let { removeTutorial } = useTutorial();

  return (
    <div className="tutorialBanner mt-auto shrink-0 accent-container flex flex-row items-center justify-between gap-4 py-3 px-4">
      <div className="font-bold">Tutorial Here</div>
      <ButtonSecondary onClick={removeTutorial}>
        Remove Tutorial
      </ButtonSecondary>
    </div>
  );
}
