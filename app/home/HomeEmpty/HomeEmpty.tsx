"use client";

import { PubListEmptyIllo } from "components/ActionBar/Publications";
import { ButtonPrimary } from "components/Buttons";
import { AddSmall } from "components/Icons/AddSmall";
import { Link } from "react-aria-components";
import { DiscoverIllo } from "./DiscoverIllo";
import { WelcomeToLeafletIllo } from "./WelcomeToLeafletIllo";
import { DiscoverSmall } from "components/Icons/DiscoverSmall";
import { PublishSmall } from "components/Icons/PublishSmall";
import { createNewLeaflet } from "actions/createNewLeaflet";
import { useIsMobile } from "src/hooks/isMobile";

export function HomeEmptyState() {
  let isMobile = useIsMobile();
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
          <ButtonPrimary
            className="!text-lg my-3"
            onClick={async () => {
              let openNewLeaflet = (id: string) => {
                if (isMobile) {
                  window.location.href = `/${id}?focusFirstBlock`;
                } else {
                  window.open(`/${id}?focusFirstBlock`, "_blank");
                }
              };

              let id = await createNewLeaflet({
                pageType: "doc",
                redirectUser: false,
              });
              openNewLeaflet(id);
            }}
          >
            <AddSmall /> Write a Doc!
          </ButtonPrimary>
        </div>
      </div>
      <div className="flex gap-2 w-full items-center text-tertiary font-normal italic">
        <hr className="border-border w-full" />
        <div>or</div>
        <hr className="border-border w-full" />
      </div>
      <PublicationBanner />
      <DiscoverBanner />
      <div className="text-tertiary italic text-sm font-normal -mt-2">
        Note: Right now docs and publications are separate. Soon you'll be able
        to send docs to pubs!
      </div>
    </div>
  );
}

export const PublicationBanner = (props: { small?: boolean }) => {
  return (
    <div
      className={`accent-container flex sm:py-2 gap-4 items-center ${props.small ? "items-start p-2 text-sm font-normal" : "items-center p-4"}`}
    >
      {props.small ? (
        <PublishSmall className="shrink-0" />
      ) : (
        <div className="w-[64px] mx-auto">
          <PubListEmptyIllo />
        </div>
      )}
      <div className="grow">
        <Link href={"/lish/createPub"} className="font-bold">
          Start a Publication
        </Link>{" "}
        and blog on the Atmosphere
      </div>
    </div>
  );
};

export const DiscoverBanner = (props: { small?: boolean }) => {
  return (
    <div
      className={`accent-container flex sm:py-2 gap-4 items-center ${props.small ? "items-start p-2 text-sm font-normal" : "items-center p-4"}`}
    >
      {props.small ? (
        <DiscoverSmall className="shrink-0" />
      ) : (
        <div className="w-[64px] mx-auto">
          <DiscoverIllo />
        </div>
      )}
      <div className="grow">
        <Link href={"/discover"} className="font-bold">
          Explore Publications
        </Link>{" "}
        already on the network
      </div>
    </div>
  );
};
