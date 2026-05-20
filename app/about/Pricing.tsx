import { ButtonPrimary } from "components/Buttons";

export const Pricing = () => {
  return (
    <div className="aboutPricing mx-auto w-full text-center pt-24">
      <h2>Pricing</h2>
      <div className="flex sm:flex-row flex-col w-fit gap-8 justify-center mx-auto pt-3">
        <div className="relative flex-1 w-fill max-w-sm">
          <div className="absolute -top-28 -left-14 z-0">
            <img src="/about/free.png" alt="" className="w-[280px]" />
          </div>{" "}
          <div
            className="relative z-10 bg-white border border-border rounded-lg py-3 px-5 flex-1 max-w-sm text-left h-96"
            style={{ boxShadow: "8px 12px 0 0 #000" }}
          >
            <h3 className="leading-tight text-center">Free</h3>
            <p className="text-[1rem]! text-center text-tertiary text-snug pb-3">
              Basic Leaflet is free for everyone
            </p>
            <ButtonPrimary
              fullWidth
              className=" bg-[#57822B]! border-[#57822B]! hover:outline-[#57822B]! text-white!"
            >
              Start Writing
            </ButtonPrimary>
            <hr className="border-border-light" />

            <ul className="text-[1.25rem]! flex flex-col gap-2 mt-3">
              <li>Unlimited Pubs and Posts</li>
              <li>Atmosphere Subscriptions</li>
              <li>Custom Themes</li>
              <li>Custom Domains</li>
            </ul>
          </div>
        </div>
        <div className="relative flex-1 w-fill max-w-sm">
          <div className="absolute -bottom-34 -right-24">
            <img src="/about/paid.png" alt="" className="w-[240px]" />
          </div>
          <div
            className="bg-white border border-border rounded-lg py-4 px-5 flex-1 max-w-sm text-left h-96"
            style={{ boxShadow: "8px 12px 0 0 #000" }}
          >
            <h3 className="leading-tight text-center">$120/year</h3>
            <p className="text-[1rem]! text-center text-tertiary text-snug pb-3">
              Serious publishers need serious tools
            </p>
            <ButtonPrimary
              fullWidth
              className=" bg-[#57822B]! border-[#57822B]! hover:outline-[#57822B]! text-white!"
            >
              Get Pro
            </ButtonPrimary>

            <hr className="border-border-light" />

            <ul className="text-[1.25rem]! flex flex-col gap-2 mt-3">
              <li>Everything in Free</li>
              <li>Analytics</li>
              <li>
                <div>1k Email Subscribers</div>
                <div className="text-tertiary text-base">
                  $5/mo for every additional 1k
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
