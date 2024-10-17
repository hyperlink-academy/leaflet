import { useEffect, useState, version } from "react";
import { getHomeDocs, HomeDoc } from "app/home/storage";
import useSWR from "swr";
import { ReplicacheProvider } from "src/replicache";
import { LeafletPreview } from "app/home/LeafletPreview";
import { PermissionToken } from "src/replicache";
import { ButtonPrimary } from "components/Buttons";
import { createNewLeafletFromTemplate } from "actions/createNewLeafletFromTemplate";

import { Database } from "../../supabase/database.types";
import { createServerClient } from "@supabase/ssr";
import Image from "next/image";
import { AddTiny } from "components/Icons";
import Link from "next/link";

export function LeafletTemplate(props: {
  title: string;
  description?: string;
  image: string;
  alt: string;
  idPreview: string;
  idTemplate: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        {/* TODO: add preview with LeafletPreview */}
        {/* OR could just use a static image with text overlay maybe */}
        <div className="max-w-[274px] h-[154px] relative">
          {/* TEMPLATE PLACEHOLDER - PREVIEW WILL GO HERE! */}
          <Image
            className="absolute top-0 left-0 rounded-md w-full h-full object-cover"
            src={props.image}
            alt={props.alt}
            width={274}
            height={154}
          />
          <div className="absolute w-full max-w-[274px] h-full max-h-[154px] flex flex-col gap-2 items-center place-content-center">
            <Link
              href={`https://leaflet.pub/` + props.idPreview}
              target="_blank"
              className="no-underline hover:no-underline"
            >
              <ButtonPrimary className="bg-primary !border-2 !border-white hover:!outline-none hover:scale-105 hover:rotate-3 transition-all">
                View Preview
              </ButtonPrimary>
            </Link>
            <ButtonPrimary
              className="!w-fit mx-4 !border-2 !border-white hover:!outline-none hover:scale-105 hover:-rotate-2 transition-all"
              // TODO: make client component for the onClick to work?
              // NB: do we need the edit link or will the readonly one work?

              //   onClick={async () => {
              //     let id = await createNewLeafletFromTemplate(props.idTemplate, false);
              //     window.open(`/${props.idTemplate}`, "_blank");
              //   }}
            >
              New from Template
              <AddTiny />
            </ButtonPrimary>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="font-bold">{props.title}</div>
        <div className="text-tertiary text-sm font-normal">
          {props.description}
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
        description="A small sampling of infinite theme possibilities"
      >
        <LeafletTemplate
          title="Foliage"
          image="/templates/template-foliage-548x308.jpg"
          alt="preview image of Foliage theme, with lots of green and leafy bg"
          idPreview="e4323c1d-15c1-407d-afaf-e5d772a35f0e"
          idTemplate=""
        />
        <LeafletTemplate
          title="Lunar"
          image="/templates/template-lunar-548x308.jpg"
          alt="preview image of Lunar theme, with dark grey, red, and moon bg"
          idPreview="219d14ab-096c-4b48-83ee-36446e335c3e"
          idTemplate=""
        />
        <LeafletTemplate
          title="Paper"
          image="/templates/template-paper-548x308.jpg"
          alt="preview image of Paper theme, with red, gold, green and marbled paper bg"
          idPreview="9b28ceea-0220-42ac-87e6-3976d156f653"
          idTemplate=""
        />
        <LeafletTemplate
          title="Oceanic"
          image="/templates/template-oceanic-548x308.jpg"
          alt="preview image of Oceanic theme, with dark and light blue and ocean bg"
          idPreview="a65a56d7-713d-437e-9c42-f18bdc6fe2a7"
          idTemplate=""
        />
      </TemplateList>
    </>
  );
}

export function TemplateListExamples() {
  return (
    <TemplateList
      name="Examples"
      description="Creative documents to make and share with Leaflet"
    >
      <LeafletTemplate
        title="Reading List"
        description="Make a topical list to track your own reading, or share recs with friends!"
        image="/templates/template-foliage-548x308.jpg"
        alt="TK"
        idPreview=""
        idTemplate=""
      />
      <LeafletTemplate
        title="Travel Planning"
        description="Organize a trip — notes, logistics, itinerary, even a shared journal or scrapbook."
        image="/templates/template-foliage-548x308.jpg"
        alt="TK"
        idPreview=""
        idTemplate=""
      />
      <LeafletTemplate
        title="Gift Guide"
        description="Share favorite things with friends or loved ones — products, movies, restaurants…"
        image="/templates/template-foliage-548x308.jpg"
        alt="TK"
        idPreview=""
        idTemplate=""
      />
      <LeafletTemplate
        title="Event Page"
        description="Host an event — from a single party or meetup, to a whole conference or symposium!"
        image="/templates/template-foliage-548x308.jpg"
        alt="TK"
        idPreview=""
        idTemplate=""
      />
    </TemplateList>
  );
}
