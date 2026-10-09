"use client";
import { ButtonPrimary } from "components/Buttons";
import { GoToArrowLined } from "components/Icons/GoToArrowLined";
import { createNewLeaflet } from "actions/createNewLeaflet";
import { useIsMobile } from "src/hooks/isMobile";
import { SpeedyLink } from "components/SpeedyLink";

export function HomeEmptyState() {
  return (
    <div className="grow w-full flex flex-col items-center justify-center text-center py-4">
      <div className="flex flex-col gap-3 text-lg max-w-lg w-full sm:px-4">
        <h2>
          How do you want to <br className="sm:hidden block" />
          get started?
        </h2>
        <div className="flex gap-4 flex-col items-stretch">
          <PublicationOption />
          <DocOption />
        </div>
      </div>
    </div>
  );
}

const PublicationOption = () => {
  return (
    <div className="light-container p-3 flex sm:flex-row flex-col gap-4">
      <img
        src="/illustrations/start-a-publication.webp"
        alt=""
        className="h-auto w-36 object-contain mx-auto"
      />
      <div className="text-base sm:text-left grow flex flex-col gap-1">
        <h3>Start a Publication</h3>
        <div className="grow">
          Start a blog, newsletter, comic, novel, zine, etc. Make a homepage and
          publish posts!
        </div>
        <SpeedyLink href="/lish/createPub" className="mt-2">
          <ButtonPrimary fullWidth>
            New Publication
            <GoToArrowLined />
          </ButtonPrimary>
        </SpeedyLink>
      </div>
    </div>
  );
};

const DocOption = () => {
  let isMobile = useIsMobile();

  return (
    <div className="light-container p-3 flex sm:flex-row flex-col gap-4">
      <img
        src="/illustrations/start-writing.webp"
        alt=""
        className="h-auto w-36 object-contain mx-auto"
      />
      <div className="text-base sm:text-left grow flex flex-col gap-1">
        <h3>Write something</h3>
        <div className="grow">
          Just start writing! Add this to a publication later, share and collab
          on it with friends, or just write it for you.
        </div>
        <ButtonPrimary
          fullWidth
          className="mt-2"
          onClick={async () => {
            let openNewLeaflet = (id: string) => {
              if (isMobile) {
                window.location.href = `/${id}?focusFirstBlock&addToHome`;
              } else {
                window.open(`/${id}?focusFirstBlock&addToHome`, "_blank");
              }
            };

            let id = await createNewLeaflet({
              pageType: "doc",
              redirectUser: false,
            });
            openNewLeaflet(id);
          }}
        >
          New Doc <GoToArrowLined />
        </ButtonPrimary>
      </div>
    </div>
  );
};
