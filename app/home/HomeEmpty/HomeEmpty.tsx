import { PubListEmptyIllo } from "components/ActionBar/Publications";
import { ButtonPrimary } from "components/Buttons";
import { AddSmall } from "components/Icons/AddSmall";
import { Link } from "react-aria-components";
import { DiscoverIllo } from "./DiscoverIllo";
import { WelcomeToLeafletIllo } from "./WelcomeToLeafletIllo";

export function HomeEmptyState() {
  return (
    <div className="flex flex-col gap-4 font-bold">
      <div className="container p-2 flex gap-4">
        <div className="w-[72px]">
          <WelcomeToLeafletIllo />
        </div>
        <div className="flex flex-col grow">
          <h3 className="text-xl font-semibold pt-2">Leaflet</h3>
          {/*<h3>A platform for social publishing.</h3>*/}
          <div className="font-normal text-tertiary italic">
            Write and share delightful documents!
          </div>
          <ButtonPrimary className="!text-lg my-3">
            <AddSmall /> Write a Doc!
          </ButtonPrimary>
        </div>
      </div>
      <div className="flex gap-2 w-full items-center text-tertiary font-normal italic">
        <hr className="border-border w-full" />
        <div>or</div>
        <hr className="border-border w-full" />
      </div>
      <div className="accent-container p-4 flex sm:py-2 gap-4 items-center">
        <div className="w-[64px] mx-auto">
          <PubListEmptyIllo />
        </div>
        <div className="grow">
          <Link href={"/"}>Start a Publication</Link> and blog on the Atmosphere
        </div>
      </div>
      <div className="accent-container sm:py-2 p-4 flex gap-4 items-center">
        <div className="w-[64px] mx-auto">
          <DiscoverIllo />
        </div>
        <div className="grow">
          <Link href={"/discover"}>Explore blogs</Link> already on the network
        </div>
      </div>
    </div>
  );
}
