"use client";

import { Media } from "components/Media";
import { NewDraftActionButton } from "./NewDraftButton";
import { ActionButton } from "components/ActionBar/ActionButton";
import { useRouter } from "next/navigation";
import { Popover } from "components/Popover";
import { SettingsSmall } from "components/Icons/SettingsSmall";
import { ShareSmall } from "components/Icons/ShareSmall";
import { Menu } from "components/Layout";
import { MenuItem } from "components/Layout";
import Link from "next/link";
import { HomeSmall } from "components/Icons/HomeSmall";
import { EditPubForm } from "app/lish/createPub/UpdatePubForm";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { usePublicationData } from "./PublicationSWRProvider";
import { useSmoker } from "components/Toast";
import { PaintSmall } from "components/Icons/PaintSmall";
import { PubThemeSetter } from "components/ThemeManager/PubThemeSetter";

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
      <PublicationThemeButton />
      <PublicationSettingsButton publication={props.publication} />
      <hr className="border-border-light" />
      <Media mobile={false}>
        <Link
          href="/home"
          prefetch
          className="hover:no-underline"
          style={{ textDecorationLine: "none !important" }}
        >
          <ActionButton icon={<HomeSmall />} label="Go Home" />
        </Link>
      </Media>
    </>
  );
};

function PublicationShareButton() {
  let { data: pub } = usePublicationData();
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
            text: "Copied Publication URL!",
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
  return (
    <Popover
      asChild
      className="max-w-xs"
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

function PublicationThemeButton() {
  return (
    <Popover
      asChild
      className="max-w-xs pb-0 !bg-white"
      trigger={
        <ActionButton id="pub-theme-button" icon=<PaintSmall /> label="Theme" />
      }
    >
      <PubThemeSetter />
    </Popover>
  );
}
