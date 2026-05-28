export const Features = () => {
  return (
    <>
      <div className="aboutSpotlightFeatures pt-16 sm:pt-32 flex flex-col gap-16  sm:gap-32">
        <div className="flex md:flex-row flex-col md:gap-12 gap-4 justify-center">
          <img
            src="/about/reach-audience.png"
            alt=""
            className="w-fill min-w-[160px] max-w-[720px] grow mx-auto"
          />
          <div className="flex flex-col w-fill max-w-sm text-center md:text-left md:py-4 py-0 mx-auto">
            <h3>Reach your readers</h3>
            <p className="text-secondary">
              Send updates via Email, Bluesky, and the Atmosphere{" "}
            </p>
            <p className="text-secondary pt-2">
              Leverage a social ecosystem with millions of users
            </p>
          </div>
        </div>
        <div className="flex md:flex-row flex-col-reverse md:gap-8 gap-4 justify-center">
          <div className="flex flex-col w-fill max-w-sm text-center md:text-right md:py-4 py-0 mx-auto">
            <h3>Express yourself</h3>
            <p className="text-secondary">
              Free custom themes <br />
              and domains
            </p>
          </div>
          <img
            src="/about/customize.png"
            alt=""
            className="w-fill min-w-[160px] max-w-[720px] grow mx-auto"
          />
        </div>
      </div>
      <div className="flex sm:flex-row flex-col gap-4 sm:gap-8  w-fit mx-auto pt-12 sm:pt-20 items-stretch">
        <div className="flex-1 flex flex-col text-center">
          <h4>Write together</h4>
          <p className="text-secondary">
            Collaborative editing <br />
            and easy sharing
          </p>
        </div>
        <div className="border-l border-t border-border sm:w-px w-full " />
        <div className="flex-1 flex flex-col text-center">
          <h4>Build your community</h4>
          <p className="text-secondary">
            Newsletters, events, <br />
            conversations and more
          </p>
        </div>
      </div>
    </>
  );
};
