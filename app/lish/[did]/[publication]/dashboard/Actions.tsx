"use client";

import { NewDraftActionButton } from "./NewDraftButton";
import { PublicationSettingsButton } from "./PublicationSettings";
import { ActionButton } from "components/ActionBar/ActionButton";
import { ShareSmall } from "components/Icons/ShareSmall";
import { Menu } from "components/Layout";
import { MenuItem } from "components/Layout";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { usePublicationData } from "./PublicationSWRProvider";
import { useSmoker } from "components/Toast";
import { useIsMobile } from "src/hooks/isMobile";
import { SpeedyLink } from "components/SpeedyLink";

export const Actions = (props: { publication: string }) => {
  return (
    <>
      <NewDraftActionButton publication={props.publication} />
      <PublicationShareButton />
      <PublicationSettingsButton publication={props.publication} />
    </>
  );
};

function PublicationShareButton() {
  let { data: pub } = usePublicationData();
  let smoker = useSmoker();
  let isMobile = useIsMobile();

  return (
    <Menu
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      className="max-w-xs"
      asChild
      trigger={
        <ActionButton
          id="pub-share-button"
          icon=<ShareSmall />
          label="Share"
          onClick={() => {}}
        />
      }
    >
      <MenuItem onSelect={() => {}}>
        <SpeedyLink
          href={getPublicationURL(pub?.publication!)}
          className="text-secondary hover:no-underline"
        >
          <div>Viewer Mode</div>
          <div className="font-normal text-tertiary text-sm">
            View your publication as a reader
          </div>
        </SpeedyLink>
      </MenuItem>
      <MenuItem
        onSelect={(e) => {
          e.preventDefault();
          let rect = (e.currentTarget as Element)?.getBoundingClientRect();
          navigator.clipboard.writeText(getPublicationURL(pub?.publication!));
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
