"use client";

import { NewDraftActionButton } from "./NewDraftButton";
import { PublicationSettingsButton } from "./settings/PublicationSettings";
import { ActionButton } from "components/ActionBar/ActionButton";
import { ShareSmall } from "components/Icons/ShareSmall";
import { Menu, MenuItem } from "components/Menu";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { usePublicationData } from "./PublicationSWRProvider";
import { useSmoker } from "components/Toast";
import { useIsMobile } from "src/hooks/isMobile";
import { SpeedyLink } from "components/SpeedyLink";
import { ButtonSecondary, ButtonTertiary } from "components/Buttons";
import { UpgradeModal } from "../UpgradeModal";
import { LeafletPro } from "components/Icons/LeafletPro";

export const Actions = (props: { publication: string }) => {
  return (
    <>
      <NewDraftActionButton publication={props.publication} />
      <MobileUpgrade />

      <PublicationShareButton />
      <PublicationSettingsButton publication={props.publication} />
      <DesktopUpgrade />
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

const MobileUpgrade = () => {
  return (
    <UpgradeModal
      asChild
      trigger={
        <ActionButton
          label="Upgrade to Leaflet Pro"
          icon={<LeafletPro />}
          className={`sm:hidden block bg-[var(--accent-light)]!`}
          style={{ backgroundColor: "var(--accent-light) important!" }}
        />
      }
    />
  );
};

const DesktopUpgrade = () => {
  return (
    <div
      style={{ backgroundColor: "var(--accent-light)" }}
      className=" rounded-md mt-2 pt-2 pb-3 px-3 sm:block hidden"
    >
      <h4 className="text-accent-contrast text-sm">Get Leaflet Pro</h4>
      <div className="text-xs text-secondary mb-2">
        <strong>Analytics!</strong> Emails and membership soon.
      </div>
      <UpgradeModal
        asChild
        trigger={
          <ButtonSecondary fullWidth compact className="text-sm!">
            Learn more
          </ButtonSecondary>
        }
      />
      <ButtonTertiary className="mx-auto text-sm">Dismiss</ButtonTertiary>
    </div>
  );
};
