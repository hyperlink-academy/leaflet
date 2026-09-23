"use client";

import { useState } from "react";
import {
  ButtonPrimary,
  ButtonSecondary,
  ButtonTertiary,
} from "components/Buttons";
import { GoToArrowLined } from "components/Icons/GoToArrowLined";
import { useActivateTutorialNavTour } from "./TutorialNavTooltip";
import { useTutorial } from "./useTutorial";

type Step = "welcome" | "home" | "nav" | "create";

type StepProps = { setStep: (step: Step) => void };
let className = "flex flex-col gap-6 max-w-md w-full sm:p-8 p-4";

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
          case "create":
            return <GetStarted setStep={setStep} />;
        }
      })()}
    </div>
  );
}

const WelcomeToLeaflet = (props: StepProps) => {
  return (
    <>
      <div className={className}>
        <div className="flex flex-col gap-2 text-lg">
          <h2>Welcome to Leaflet!</h2>
          <div className="">
            Leaflet is a platform for writing blogs and newsletters. Create
            publications, write posts, and discover your community.
          </div>
          <div className="h-36 w-full mx-auto bg-test my-2" />

          <div>Let us show you around!</div>
        </div>
        <div className="flex flex-col gap-2">
          <ButtonPrimary
            className="mx-auto w-36!"
            onClick={() => props.setStep("home")}
          >
            Next (2/4) <GoToArrowLined />
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
              Next (3/4) <GoToArrowLined />
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
          <ButtonPrimary
            className="w-36!"
            onClick={() => props.setStep("create")}
          >
            Next (4/4) <GoToArrowLined />
          </ButtonPrimary>
        </div>
        <SkipTutorial />
      </div>
    </div>
  );
};

const GetStarted = (props: StepProps) => {
  return (
    <div className={`${className} max-w-lg!`}>
      <div className="flex flex-col gap-2 text-lg">
        <h2>Get started!</h2>
        <div className="flex gap-4 sm:flex-row flex-col items-stretch">
          <div className="light-container p-3 basis-1/2 flex flex-col gap-1">
            <div className=" w-24 h-24 rounded-full bg-test mx-auto mb-2" />
            <h3>Start a Publication</h3>
            <div className="text-base grow">
              Start a blog, newsletter, comic, novel, zine, etc. Make a homepage
              and publish posts!
            </div>
            <ButtonPrimary fullWidth className="place-self-end mt-2">
              Go
            </ButtonPrimary>
          </div>
          <div className="light-container p-3 basis-1/2 flex flex-col gap-1">
            <div className=" w-24 h-24 rounded-full bg-test mx-auto mb-2" />
            <h3>Write something</h3>
            <div className="text-base grow">
              Just start writing! You can add this to a publication later, share
              it with friends, or just write it for you.
            </div>
            <ButtonPrimary fullWidth className="place-self-end mt-2">
              Go
            </ButtonPrimary>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <ButtonSecondary
          className="w-36! mx-auto"
          onClick={() => props.setStep("nav")}
        >
          Back
        </ButtonSecondary>
        <SkipTutorial />
      </div>
    </div>
  );
};
