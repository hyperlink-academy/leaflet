import { Separator } from "components/Layout";

export const Features = () => {
  return (
    <>
      <div className="aboutSpotlightFeatures pt-24 flex flex-col gap-16">
        <div className="flex gap-8 justify-center">
          <div className="bg-[#F1EDE5]! aspect-3/2 w-fill min-w-[160px] max-w-[720px] grow" />
          <div className="flex flex-col w-fill max-w-sm py-4 ">
            <h3>Reach your readers</h3>
            <p>
              Send updates via email and on the Atmosphere, a social ecosystem
              of millions
            </p>
          </div>
        </div>
        <div className="flex gap-8 justify-center">
          <div className="flex flex-col w-fill max-w-sm text-right py-4 ">
            <h3>Express yourself</h3>
            <p>Custom themes and domains</p>
          </div>
          <div className="bg-[#F1EDE5]! aspect-3/2 w-fill min-w-[160px] max-w-[720px] grow" />
        </div>
      </div>
      <div className="flex gap-3 sm:gap-8 items-center w-fit mx-auto pt-20">
        <div className="flex-1 flex flex-col text-center">
          <h4>Write and read together</h4>
          <p>
            with collaborative editing <br />
            and easy sharing{" "}
          </p>
        </div>
        <div className="border-l border-t border-border h-[96px] w-px " />
        <div className="flex-1 flex flex-col text-center">
          <h4>Build your community</h4>
          <p>
            Plan events, start conversations, and share everything everywhere
          </p>
        </div>
      </div>
    </>
  );
};
