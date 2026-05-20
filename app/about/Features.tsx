import { Separator } from "components/Layout";

export const Features = () => {
  return (
    <>
      <div className="aboutSpotlightFeatures pt-24 flex flex-col gap-16">
        <div className="flex md:flex-row flex-col md:gap-8 gap-4 justify-center">
          {" "}
          <div className="bg-[#F1EDE5]! aspect-3/2 w-fill min-w-[160px] max-w-[720px] grow mx-auto rounded-lg" />
          <div className="flex flex-col w-fill max-w-sm text-center md:text-left md:py-4 py-0 mx-auto">
            <h3>Reach your readers</h3>
            <p>
              Send updates via email and on the Atmosphere, a social ecosystem
              of millions
            </p>
          </div>
        </div>
        <div className="flex md:flex-row flex-col-reverse md:gap-8 gap-4 justify-center">
          <div className="flex flex-col w-fill max-w-sm text-center md:text-right md:py-4 py-0 mx-auto">
            <h3>Express yourself</h3>
            <p>Custom themes and domains</p>
          </div>
          <div className="bg-[#F1EDE5]! aspect-3/2 w-fill min-w-[160px] max-w-[720px] grow mx-auto rounded-lg" />
        </div>
      </div>
      <div className="flex gap-3 sm:gap-8  w-fit mx-auto pt-12 sm:pt-20 items-stretch">
        <div className="flex-1 flex flex-col text-center">
          <h4>Write together</h4>
          <p>
            Collaborative editing <br />
            and easy sharing{" "}
          </p>
        </div>
        <div className="border-l border-t border-border w-px " />
        <div className="flex-1 flex flex-col text-center">
          <h4>Build your community</h4>
          <p>Events, conversations, and easy sharing</p>
        </div>
      </div>
    </>
  );
};
