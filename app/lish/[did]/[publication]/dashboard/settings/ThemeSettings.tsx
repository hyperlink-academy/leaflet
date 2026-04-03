"use client";

import { GoToArrow } from "components/Icons/GoToArrow";
import { SpeedyLink } from "components/SpeedyLink";
import { useParams } from "next/navigation";

export function ThemeSettings() {
  let params = useParams<{ did: string; publication: string }>();
  let href = `/lish/${params.did}/${params.publication}/theme-settings`;

  return (
    <>
      <h3 className="font-bold text-primary">Theme and Layout</h3>
      <SpeedyLink
        className="text-left flex gap-2 items-center text-accent-contrast font-bold no-underline! w-fit"
        href={href}
      >
        Customize Theme <GoToArrow />
      </SpeedyLink>
    </>
  );
}
