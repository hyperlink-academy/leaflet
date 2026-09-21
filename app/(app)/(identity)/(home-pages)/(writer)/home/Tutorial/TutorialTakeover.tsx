"use client";

import { useState } from "react";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { GoToArrowLined } from "components/Icons/GoToArrowLined";
import { useActivateTutorialNavTour } from "./TutorialNavTooltip";

type Step = "welcome" | "home" | "nav" | "create";

type StepProps = { setStep: (step: Step) => void };

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
      <h2>Welcome to Leaflet!</h2>
      <div className="font-bold">
        Leaflet is a platform for writing blogs and newsletters.
      </div>
      <div>
        Here, you can create publications, write posts, and discover the writing
        of others.
      </div>
      <div className="h-36 w-full mx-auto bg-test" />

      <div>Let us show you around!</div>
      <ButtonPrimary onClick={() => props.setStep("home")}>
        Next (2/4) <GoToArrowLined />
      </ButtonPrimary>
    </>
  );
};

const Home = (props: StepProps) => {
  return (
    <div className="light-container w-full h-full flex items-center">
      <div className="mx-auto p-8 flex flex-col gap-4">
        <h2>This is your Home!</h2>
        <div>
          Once you’ve started writing, all your drafts, documents, canvases, and
          notes will end up here for easy acesss.
        </div>

        <div className="flex gap-2 mx-auto justify-center">
          <ButtonSecondary onClick={() => props.setStep("welcome")}>
            Back
          </ButtonSecondary>
          <ButtonPrimary onClick={() => props.setStep("nav")}>
            Next (3/4) <GoToArrowLined />
          </ButtonPrimary>
        </div>
      </div>
    </div>
  );
};

const Navigation = (props: StepProps) => {
  useActivateTutorialNavTour();

  return (
    <>
      <h2>Getting around</h2>
      <div>
        Everything you need will be in the{" "}
        <span className="sm:block hidden">sidebar</span>{" "}
        <span className="sm:hidden block">footer</span>
      </div>
      <div className="flex gap-2">
        <ButtonSecondary onClick={() => props.setStep("home")}>
          Back
        </ButtonSecondary>
        <ButtonPrimary onClick={() => props.setStep("create")}>
          Next (4/4) <GoToArrowLined />
        </ButtonPrimary>
      </div>
    </>
  );
};

const GetStarted = (props: StepProps) => {
  return (
    <>
      <h2>Start a pub</h2>
      <h2>Start a doc</h2>
      <ButtonSecondary onClick={() => props.setStep("nav")}>
        Back
      </ButtonSecondary>
    </>
  );
};
