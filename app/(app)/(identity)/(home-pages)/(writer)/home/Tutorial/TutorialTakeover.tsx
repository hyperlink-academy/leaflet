"use client";

import { useState } from "react";
import { preload } from "react-dom";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { GoToArrowLined } from "components/Icons/GoToArrowLined";
import {
  useActivateTutorialNavTour,
  useBlurTutorialNav,
} from "./TutorialNavTooltip";
import { useTutorial } from "./useTutorial";

type Step = "welcome" | "home" | "nav";

type StepProps = { setStep: (step: Step) => void };
let className = "flex flex-col gap-4 sm:gap-6 max-w-md w-full sm:px-4 ";

const SkipTutorial = () => {
  let { removeTutorial } = useTutorial();
  return (
    <button
      className="mx-auto hover:text-accent-contrast text-tertiary"
      onClick={removeTutorial}
    >
      Skip Tutorial
    </button>
  );
};

export function TutorialTakeover() {
  let [step, setStep] = useState<Step>("welcome");
  // Finishing the tutorial lands on the home empty state.
  preload("/illustrations/start-a-publication.webp", { as: "image" });
  preload("/illustrations/start-writing.webp", { as: "image" });
  useBlurTutorialNav(step === "welcome" || step === "home");

  return (
    <div className="tutorialTakeover grow w-full flex flex-col items-center justify-center gap-4 text-center">
      {(() => {
        switch (step) {
          case "welcome":
            return <WelcomeToLeaflet setStep={setStep} />;
          case "home":
            return <Home setStep={setStep} />;
          case "nav":
            return <Navigation setStep={setStep} />;
        }
      })()}
    </div>
  );
}

const WelcomeToLeaflet = (props: StepProps) => {
  return (
    <>
      <div className={`${className} max-w-3xl!`}>
        <picture className="">
          <source
            media="(min-width: 640px)"
            srcSet="/illustrations/welcome-to-leaflet.webp"
          />
          <img
            src="/illustrations/welcome-to-leaflet-mobile.webp"
            alt="Welcome to Leaflet!"
            className="w-full max h-auto sm:mb-2 rounded-lg"
          />
        </picture>
        <div className="flex flex-col gap-2 sm:text-lg max-w-xl mx-auto">
          <div className="font-bold">
            Leaflet is a platform for writing
            <br /> blogs and newsletters.
          </div>{" "}
          <div>
            Here, you can create publications, write posts, and discover your
            community.
          </div>
          <div>Let us show you around!</div>
        </div>
        <div className="flex flex-col gap-2">
          <ButtonPrimary
            className="mx-auto w-36!"
            onClick={() => props.setStep("home")}
          >
            Next (1/3) <GoToArrowLined />
          </ButtonPrimary>
          <SkipTutorial />
        </div>
      </div>
    </>
  );
};

const Home = (props: StepProps) => {
  return (
    <div className="light-container w-full h-full flex items-center justify-center">
      <div className={className}>
        <div className="flex flex-col gap-2 text-lg">
          <h2>This is your Home!</h2>
          <div>
            Once you’ve started writing, all your drafts, documents, canvases,
            and notes will end up here for easy acesss.
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 mx-auto justify-center">
            <ButtonSecondary
              className="w-36!"
              onClick={() => props.setStep("welcome")}
            >
              Back
            </ButtonSecondary>
            <ButtonPrimary
              className="w-36!"
              onClick={() => props.setStep("nav")}
            >
              Next (2/3) <GoToArrowLined />
            </ButtonPrimary>
          </div>
          <SkipTutorial />
        </div>
      </div>
    </div>
  );
};

const Navigation = (props: StepProps) => {
  useActivateTutorialNavTour();
  let { removeTutorial } = useTutorial();

  return (
    <div className={className}>
      <div className="flex flex-col gap-2 text-lg">
        <h2>This is your Navigation</h2>
        <div>
          You'll find all the navigation and actions you can take in the{" "}
          <span className="sm:inline-block hidden">sidebar</span>
          <span className="sm:hidden inline-block">footer</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 mx-auto">
          <ButtonSecondary
            className="w-36!"
            onClick={() => props.setStep("home")}
          >
            Back
          </ButtonSecondary>
          <ButtonPrimary className="w-36!" onClick={removeTutorial}>
            Finish <GoToArrowLined />
          </ButtonPrimary>
        </div>
        <SkipTutorial />
      </div>
    </div>
  );
};
