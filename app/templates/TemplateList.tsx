"use client";

import { ButtonPrimary } from "components/Buttons";
import Image from "next/image";
import Link from "next/link";
import { createNewLeafletFromTemplate } from "actions/createNewLeafletFromTemplate";
import { AddTiny } from "components/Icons";

export function LeafletTemplate(props: {
  title: string;
  description?: string;
  image: string;
  alt: string;
  templateID: string; // readonly id for the leaflet that will be duplicated
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        <div className="max-w-[274px] h-[154px] relative">
          <Image
            className="absolute top-0 left-0 rounded-md w-full h-full object-cover"
            src={props.image}
            alt={props.alt}
            width={274}
            height={154}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="font-bold text-center">{props.title}</h3>
        <div className="text-tertiary text-sm font-normal text-center">
          {props.description}
        </div>
        <div className="flex gap-2 justify-center items-end bottom-4">
          <Link
            href={`https://leaflet.pub/` + props.templateID}
            target="_blank"
            className="no-underline hover:no-underline"
          >
            <ButtonPrimary className="bg-primary !border-2 !border-white hover:!outline-none hover:scale-105 hover:rotate-3 transition-all">
              Preview
            </ButtonPrimary>
          </Link>
          <ButtonPrimary
            className="!w-fit !border-2 !border-white hover:!outline-none hover:scale-105 hover:-rotate-2 transition-all"
            onClick={async () => {
              let id = await createNewLeafletFromTemplate(
                props.templateID,
                false,
              );
              window.open(`/${id}`, "_blank");
            }}
          >
            Create
            <AddTiny />
          </ButtonPrimary>
        </div>
      </div>
    </div>
  );
}

export function TemplateList(props: {
  name: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="templateLeafletGrid flex flex-col gap-4">
      <div className="flex flex-col gap-2 text-center">
        <h2 className="">{props.name}</h2>
        <p className="">{props.description}</p>
      </div>
      <div className="grid auto-rows-max md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-y-8 gap-x-4 sm:gap-6 grow pb-8">
        {props.children}
      </div>
    </div>
  );
}

export function TemplateListThemes() {
  return (
    <>
      <TemplateList
        name="Themes"
        description="A small sampling of Leaflet's infinite theme possibilities!"
      >
        <LeafletTemplate
          title="Foliage"
          image="/templates/template-foliage-548x308.jpg"
          alt="preview image of Foliage theme, with lots of green and leafy bg"
          templateID="e4323c1d-15c1-407d-afaf-e5d772a35f0e"
        />
        <LeafletTemplate
          title="Lunar"
          image="/templates/template-lunar-548x308.jpg"
          alt="preview image of Lunar theme, with dark grey, red, and moon bg"
          templateID="219d14ab-096c-4b48-83ee-36446e335c3e"
        />
        <LeafletTemplate
          title="Paper"
          image="/templates/template-paper-548x308.jpg"
          alt="preview image of Paper theme, with red, gold, green and marbled paper bg"
          templateID="9b28ceea-0220-42ac-87e6-3976d156f653"
        />
        <LeafletTemplate
          title="Oceanic"
          image="/templates/template-oceanic-548x308.jpg"
          alt="preview image of Oceanic theme, with dark and light blue and ocean bg"
          templateID="a65a56d7-713d-437e-9c42-f18bdc6fe2a7"
        />
      </TemplateList>
    </>
  );
}

export function TemplateListExamples() {
  return (
    <TemplateList
      name="Examples"
      description="Creative documents you can make and share with Leaflet"
    >
      <LeafletTemplate
        title="Reading List"
        description="Make a list for your own reading, or share recs with friends!"
        image="/templates/template-reading-548x308.jpg"
        alt="preview image of Reading List template, with a few sections and example books as sub-pages"
        templateID="a5655b68-fe7a-4494-bda6-c9847523b2f6"
      />
      <LeafletTemplate
        title="Travel Plan"
        description="Organize a trip — notes, logistics, itinerary, even a shared scrapbook"
        image="/templates/template-travel-548x308.jpg"
        alt="preview image of a Travel Plan template, with pages for itinerary, logistics, research, and a travel diary canvas"
        templateID="4d6f1392-dfd3-4015-925d-df55b7da5566"
      />
      <LeafletTemplate
        title="Gift Guide"
        description="Share your favorite things — products, restaurants, movies…"
        image="/templates/template-gift-548x308.jpg"
        alt="preview image for a Gift Guide template, with three blank canvases for different categories"
        templateID="de73df29-35d9-4a43-a441-7ce45ad3b498"
      />
      <LeafletTemplate
        title="Event Page"
        description="Host an event — from a single meetup, to a whole conference!"
        image="/templates/template-event-548x308.jpg"
        alt="preview image for an Event Page template, with an event info section and linked pages / canvases for more info"
        templateID="23d8a4ec-b2f6-438a-933d-726d2188974d"
      />
    </TemplateList>
  );
}
