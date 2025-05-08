import Link from "next/link";
import { TemplateListExamples, TemplateListThemes } from "./TemplateList";
import { ActionButton } from "components/ActionBar/ActionButton";
import { HomeSmall } from "components/Icons";

export const metadata = {
  title: "Leaflet Templates",
  description: "example themes and documents you can use!",
};

export default function Templates() {
  return (
    <div className="flex h-full bg-bg-leaflet">
      <div className="home relative max-w-screen-lg w-full h-full mx-auto flex sm:flex-row flex-col-reverse px-4 sm:px-6 ">
        <div className="homeOptions z-10 shrink-0 sm:static absolute bottom-0  place-self-end sm:place-self-start flex sm:flex-col flex-row-reverse gap-2 sm:w-fit w-full items-center pb-2 pt-1 sm:pt-7">
          {/* NOT using <HomeButton /> b/c it does a permission check we don't need */}
          <Link href="/home">
            <ActionButton
              noLabelOnMobile
              icon={<HomeSmall />}
              label="Go Home"
              background="bg-accent-1"
              text="text-accent-2"
            />
          </Link>
        </div>
        <div className="flex flex-col gap-10 py-6 pt-3 sm:pt-6 sm:pb-12 sm:pl-6 grow w-full h-full overflow-y-scroll no-scrollbar">
          <h1 className="text-center">Template Library</h1>
          <TemplateListThemes />
          <TemplateListExamples />
        </div>
      </div>
    </div>
  );
}
