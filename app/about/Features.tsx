import { Separator } from "components/Layout";

export const Features = () => {
  return (
    <>
      <div className="aboutSpotlightFeatures pt-24 flex flex-col gap-24">
        <div className="flex gap-8 justify-center">
          <div className="bg-[#F1EDE5]! aspect-3/2 w-fill min-w-[160px] max-w-[720px] grow" />
          <div className="flex flex-col w-fill max-w-sm py-4 ">
            <h3>Something</h3>
            <p>This is some text that goes underneath as a description</p>
          </div>
        </div>
        <div className="flex gap-8 justify-center">
          <div className="flex flex-col w-fill max-w-sm text-right py-4 ">
            <h3>Something</h3>
            <p>This is some text that goes underneath as a description</p>
          </div>
          <div className="bg-[#F1EDE5]! aspect-3/2 w-fill min-w-[160px] max-w-[720px] grow" />
        </div>
        <div className="flex gap-8 justify-center">
          <div className="bg-[#F1EDE5]! aspect-3/2 w-fill min-w-[160px] max-w-[720px] grow" />
          <div className="flex flex-col w-fill max-w-sm py-4 ">
            <h3>Something</h3>
            <p>This is some text that goes underneath as a description</p>
          </div>
        </div>
      </div>
      <div className="flex gap-3 sm:gap-8 items-center w-fit mx-auto pt-20">
        <div className="flex flex-col text-center">
          <h4>Hello</h4>
          <p>this is some text</p>
        </div>
        <div className="border-l border-t border-border h-[80px] w-px " />
        <div className="flex flex-col text-center">
          <h4>Hello</h4>
          <p>this is some text</p>
        </div>
        <div className="border-l border-t border-border h-[80px] w-px" />
        <div className="flex flex-col text-center">
          <h4>Hello</h4>
          <p>this is some text</p>
        </div>
      </div>
    </>
  );
};
