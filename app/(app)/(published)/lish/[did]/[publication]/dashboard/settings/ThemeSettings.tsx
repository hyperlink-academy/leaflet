"use client";

import { GoToArrow } from "components/Icons/GoToArrow";
import { SpeedyLink } from "components/SpeedyLink";
import { useParams } from "next/navigation";
import { usePublicationData } from "../PublicationSWRProvider";

export function ThemeSettings() {
  let params = useParams<{ did: string; publication: string }>();
  let { data } = usePublicationData();
  // Once a publication has adopted the new page editor (it has a draft
  // leaflet), theme editing — background image included — lives there, so send
  // people to it rather than the legacy theme-settings editor.
  let href = data?.publication?.draft_leaflet
    ? `/lish/${params.did}/${params.publication}/edit`
    : `/lish/${params.did}/${params.publication}/theme-settings`;

  return (
    <>
      <SpeedyLink
        className="text-left flex gap-2 items-center text-accent-contrast font-bold no-underline! w-fit"
        href={href}
      >
        Customize Theme <GoToArrow />
      </SpeedyLink>
    </>
  );
}
