"use client";

import { Media } from "components/Media";
import { NewDraftActionButton } from "./NewDraftButton";
import { ActionButton } from "components/ActionBar/ActionButton";
import { useRouter } from "next/navigation";
import { Popover } from "components/Popover";
import { SettingsSmall } from "components/Icons/SettingsSmall";
import { CreatePubForm } from "app/lish/createPub/CreatePubForm";
import { ShareSmall } from "components/Icons/ShareSmall";
import { Menu } from "components/Layout";
import { MenuItem } from "components/Layout";
import Link from "next/link";
import { HomeSmall } from "components/Icons/HomeSmall";
import { EditPubForm } from "app/lish/createPub/UpdatePubForm";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { usePublicationData } from "./PublicationSWRProvider";
import { useSmoker } from "components/Toast";

export const Actions = (props: { publication: string }) => {
  return (
    <>
      <Media mobile>
        <Link
          href="/home"
          prefetch
          className="hover:no-underline"
          style={{ textDecorationLine: "none !important" }}
        >
          <ActionButton icon={<HomeSmall />} label="Go Home" />
        </Link>
      </Media>
      <NewDraftActionButton publication={props.publication} />
      <PublicationShareButton />
      <PublicationSettingsButton publication={props.publication} />
      <hr className="border-border-light" />
      <Link
        href="/home"
        prefetch
        className="hover:no-underline"
        style={{ textDecorationLine: "none !important" }}
      >
        <ActionButton icon={<HomeSmall />} label="Go Home" />
      </Link>
    </>
  );
};

function PublicationShareButton() {
  let pub = usePublicationData();
  let smoker = useSmoker();
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
        <Link
          href={getPublicationURL(pub!)}
          className="text-secondary hover:no-underline"
        >
          <div>Viewer Mode</div>
          <div className="font-normal text-tertiary text-sm">
            View your publication as a reader
          </div>
        </Link>
      </MenuItem>
      <MenuItem
        onSelect={(e) => {
          e.preventDefault();
          let rect = (e.currentTarget as Element)?.getBoundingClientRect();
          navigator.clipboard.writeText(getPublicationURL(pub!));
          smoker({
            position: {
              x: rect ? rect.left + (rect.right - rect.left) / 2 : 0,
              y: rect ? rect.top + 26 : 0,
            },
            text: "Copied Publicaiton URL!",
          });
        }}
      >
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
      <EditPubForm />
    </Popover>
  );
}
