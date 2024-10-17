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
  id: string;
  image: string;
  alt: string;
  title: string;
  description?: string;
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
        description="Just a few of infinite theme possibilities — a nice starting point for further customization"
      >
        <LeafletTemplate
          id="TK"
          image="/templates/template-foliage-548x308.jpg"
          alt="TK"
          title="Foliage"
          idPreview="e4323c1d-15c1-407d-afaf-e5d772a35f0e"
          idTemplate="TK"
        />
        <LeafletTemplate
          id="TK"
          image="/templates/template-foliage-548x308.jpg"
          alt="TK"
          title="Lunar"
        />
        <LeafletTemplate
          id="TK"
          image="/templates/template-foliage-548x308.jpg"
          alt="TK"
          title="Paper"
        />
        <LeafletTemplate
          id="TK"
          image="/templates/template-foliage-548x308.jpg"
          alt="TK"
          title="Oceanic"
        />
      </TemplateList>
    </>
  );
}

export function TemplateListExamples() {
  return (
    <TemplateList
      name="Examples"
      description="Useful ways to use Leaflet for creative shared documents"
    >
      <LeafletTemplate
        id="TK"
        image="/templates/template-foliage-548x308.jpg"
        alt="TK"
        title="Reading List"
        description="Make a topical list to track your own reading, or share recs with friends!"
      />
      <LeafletTemplate
        id="TK"
        image="/templates/template-foliage-548x308.jpg"
        alt="TK"
        title="Travel Planning"
        description="Organize a trip — notes, logistics, itinerary, even a shared journal or scrapbook."
      />
      <LeafletTemplate
        id="TK"
        image="/templates/template-foliage-548x308.jpg"
        alt="TK"
        title="Gift Guide"
        description="Share favorite things with friends or loved ones — products, movies, restaurants…"
      />
      <LeafletTemplate
        id="TK"
        image="/templates/template-foliage-548x308.jpg"
        alt="TK"
        title="Event Page"
        description="Host an event — from a single party or meetup, to a whole conference or symposium!"
      />
    </TemplateList>
  );
}
