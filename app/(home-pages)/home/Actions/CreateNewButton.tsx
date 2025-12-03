"use client";

import { Action } from "@vercel/sdk/esm/models/userevent";
import { createNewLeaflet } from "actions/createNewLeaflet";
import { ActionButton } from "components/ActionBar/ActionButton";
import { AddTiny } from "components/Icons/AddTiny";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import { BlockCanvasPageSmall } from "components/Icons/BlockCanvasPageSmall";
import { BlockDocPageSmall } from "components/Icons/BlockDocPageSmall";
import { LooseLeafSmall } from "components/Icons/LooseleafSmall";
import { Menu, MenuItem, Separator } from "components/Layout";
import { useIsMobile } from "src/hooks/isMobile";
import { useIdentityData } from "components/IdentityProvider";
import { PubIcon } from "components/ActionBar/Publications";
import { PubLeafletPublication } from "lexicons/api";
import { createPublicationDraft } from "actions/createPublicationDraft";
import { useRouter } from "next/navigation";
import Link from "next/link";

export const CreateNewLeafletButton = (props: {}) => {
  let isMobile = useIsMobile();
  let openNewLeaflet = (id: string) => {
    if (isMobile) {
      window.location.href = `/${id}?focusFirstBlock`;
    } else {
      window.open(`/${id}?focusFirstBlock`, "_blank");
    }
  };
  return (
    <div className="flex gap-0 flex-row w-full">
      <ActionButton
        id="new-leaflet-button"
        primary
        icon=<AddTiny className="m-1 shrink-0" />
        label="New"
        className="grow rounded-r-none sm:ml-0! sm:mr-0! ml-1! mr-0!"
      />
      <Separator />
      <CreateNewMoreOptionsButton />
    </div>
  );
};

export const CreateNewMoreOptionsButton = (props: {}) => {
  let { identity } = useIdentityData();

  let isMobile = useIsMobile();
  let openNewLeaflet = (id: string) => {
    if (isMobile) {
      window.location.href = `/${id}?focusFirstBlock`;
    } else {
      window.open(`/${id}?focusFirstBlock`, "_blank");
    }
  };

  return (
    <Menu
      asChild
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      className="py-2"
      trigger={
        <ActionButton
          id="new-leaflet-more-options"
          primary
          icon=<ArrowDownTiny className="m-1 shrink-0 sm:-rotate-90 rotate-180" />
          className="shrink-0 rounded-l-none w-[34px]! sm:mr-0! sm:ml-0! mr-1! ml-0!"
        />
      }
    >
      <div className="mx-2 text-sm text-tertiary ">New Leaflet</div>
      <MenuItem
        className="pt-0.5!"
        onSelect={async () => {
          let id = await createNewLeaflet({
            pageType: "doc",
            redirectUser: false,
          });
          openNewLeaflet(id);
        }}
      >
        <BlockDocPageSmall />
        <div className="flex flex-col">
          <div>Doc</div>
          <div className="text-tertiary text-sm font-normal">
            A good ol&apos; text document
          </div>
        </div>
      </MenuItem>
      <MenuItem
        className="pt-0.5!"
        onSelect={async () => {
          let id = await createNewLeaflet({
            pageType: "canvas",
            redirectUser: false,
          });
          openNewLeaflet(id);
        }}
      >
        <BlockCanvasPageSmall />
        <div className="flex flex-col">
          Canvas
          <div className="text-tertiary text-sm font-normal">
            A digital whiteboard
          </div>
        </div>
      </MenuItem>
      <div className="mx-2 text-sm text-tertiary mt-2">New Draft</div>

      {identity?.publications.map((pub) => {
        let router = useRouter();
        return (
          <MenuItem
            onSelect={async () => {
              let newLeaflet = await createPublicationDraft(pub.uri);
              router.push(`/${newLeaflet}`);
            }}
          >
            <PubIcon
              record={pub.record as PubLeafletPublication.Record}
              uri={pub.uri}
            />
            {pub.name}
          </MenuItem>
        );
      })}

      <hr className="border-border-light border-dashed mx-2 my-0.5" />
      <MenuItem onSelect={async () => {}}>
        <LooseLeafSmall />
        Looseleaf
      </MenuItem>
    </Menu>
  );
};
