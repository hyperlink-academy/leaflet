"use client";
import { PubListEmptyIllo } from "components/ActionBar/Publications";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { WelcomeToLeafletIllo } from "./WelcomeToLeafletIllo";
import { createNewLeaflet } from "actions/createNewLeaflet";
import { useIsMobile } from "src/hooks/isMobile";
import { SpeedyLink } from "components/SpeedyLink";

export function HomeEmptyState() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <PublicationBanner />
      <div className="flex sm:flex-col flex-row gap-2 sm:w-fit w-full items-center text-tertiary font-normal italic">
        <hr className="border-border grow w-full sm:w-px h-px sm:h-full border-l" />
        <div>or</div>
        <hr className="border-border grow w-full sm:w-px h-px sm:h-full border-l" />
      </div>
      <DocBanner />
    </div>
  );
}

let bannerStyles =
  "flex flex-row sm:flex-col py-4 px-4 sm:items-center items-start gap-4";

const PublicationBanner = () => {
  return (
    <div className={`accent-container sm:basis-2/3 ${bannerStyles}`}>
      <div className="my-auto flex flex-row sm:flex-col gap-4">
        <div className="w-[64px] mx-auto">
          <PubListEmptyIllo />
        </div>
        <div className={`flex flex-col sm:text-center text-left w-full`}>
          <h3>Create a Publication!</h3>
          <div className="mb-2 text-tertiary">
            You can decide to share or publish it later.
          </div>
          <SpeedyLink href="/lish/createPub" className="sm:mx-auto mx-0 ">
            <ButtonPrimary>Create a Publication</ButtonPrimary>
          </SpeedyLink>
        </div>
      </div>
    </div>
  );
};

const DocBanner = () => {
  let isMobile = useIsMobile();

  return (
    <div className={`text-sm sm:basis-1/3 py-0! sm:py-4! ${bannerStyles}`}>
      <div className="w-[48px] mx-auto">
        <WelcomeToLeafletIllo />
      </div>

      <div className={`grow flex flex-col sm:text-center text-left w-full`}>
        <h4>Just write something</h4>
        <div className="mb-2 text-tertiary">
          You can decide to share or publish it later.
        </div>
        <ButtonSecondary
          className="sm:mx-auto mx-0"
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
          New Doc!
        </ButtonSecondary>
      </div>
    </div>
  );
};
