"use client";

import { Media } from "components/Media";
import { NewDraftActionButton } from "./NewDraftButton";
import { HomeButton } from "components/HomeButton";
import { ActionButton } from "components/ActionBar/ActionButton";
import { useRouter } from "next/navigation";
import { Popover } from "components/Popover";
import { SettingsSmall } from "components/Icons/SettingsSmall";
import { CreatePubForm } from "app/lish/createPub/CreatePubForm";
import { ShareSmall } from "components/Icons/ShareSmall";
import { Menu } from "components/Layout";
import { MenuItem } from "components/Layout";
import Link from "next/link";

export const Actions = (props: { publication: string }) => {
  return (
    <>
      <Media mobile>
        <HomeButton isPublication />
      </Media>
      <NewDraftActionButton publication={props.publication} />
      <PublicationShareButton />
      <PublicationSettingsButton publication={props.publication} />
      <hr className="border-border-light" />
      <HomeButton isPublication />
    </>
  );
};

function PublicationShareButton() {
  return (
    <Menu
      className="max-w-xs"
      asChild
      trigger={
        <ActionButton
          id="pub-share-button"
          icon=<ShareSmall />
          secondary
          label="Share"
          onClick={() => {}}
        />
      }
    >
      <MenuItem onSelect={() => {}}>
        <Link href={"/"} className="text-secondary hover:no-underline">
          <div>Viewer Mode</div>
          <div className="font-normal text-tertiary text-sm">
            View your publication as a reader
          </div>
        </Link>
      </MenuItem>
      <MenuItem onSelect={() => {}}>
        <div>
          <div>Share Your Publication</div>
          <div className="font-normal text-tertiary text-sm">
            Copy link for the published site
          </div>
        </div>
      </MenuItem>
    </Menu>
  );
}

function PublicationSettingsButton(props: { publication: string }) {
  let router = useRouter();

  return (
    <Popover
      asChild
      trigger={
        <ActionButton
          id="pub-settings-button"
          icon=<SettingsSmall />
          label="Settings"
        />
      }
    >
      <CreatePubForm />
    </Popover>
  );
}
