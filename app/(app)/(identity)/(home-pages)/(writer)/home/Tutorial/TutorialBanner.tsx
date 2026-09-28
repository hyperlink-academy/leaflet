"use client";

import { ButtonSecondary } from "components/Buttons";
import { useTutorial } from "./useTutorial";
import { GoToArrowLined } from "components/Icons/GoToArrowLined";
import { CloseTiny } from "components/Icons/CloseTiny";

// Placeholder copy — the real onboarding content lands here later.
export function TutorialBanner() {
  let { removeTutorial, startTutorial } = useTutorial();

  return (
    <div className="tutorialBanner relative overflow-hidden shrink-0 accent-container flex flex-col   gap-2 py-3 px-4 text-secondary">
      <div className=" flex flex-col leading snug">
        <div className="font-bold flex flex-row justify-between">
          Welcome to Leaflet!
          <button className="text-tertiary" onClick={removeTutorial}>
            <CloseTiny />
          </button>
        </div>
        This is a place for writing, making blogs and sending newsletters.
      </div>
      <div className="flex gap-4">
        <button
          className="flex gap-2 shrink-0 items-center font-bold text-accent-contrast"
          onClick={startTutorial}
        >
          See the tutorial <GoToArrowLined />
        </button>
      </div>
      <img
        src="/illustrations/tutorial-wave.png"
        alt=""
        className="absolute bottom-0 right-4 translate-y-1/2 h-28 w-auto pointer-events-none"
      />
    </div>
  );
}
