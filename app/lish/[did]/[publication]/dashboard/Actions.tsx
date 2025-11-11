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
import { HomeSmall } from "components/Icons/HomeSmall";
import { EditPubForm } from "app/lish/createPub/UpdatePubForm";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { usePublicationData } from "./PublicationSWRProvider";
import { useSmoker } from "components/Toast";
import { PaintSmall } from "components/Icons/PaintSmall";
import { PubThemeSetter } from "components/ThemeManager/PubThemeSetter";
import { useIsMobile } from "src/hooks/isMobile";
import { SpeedyLink } from "components/SpeedyLink";
import { FormEvent, useState } from "react";
import { GoBackSmall } from "components/Icons/GoBackSmall";
import { theme } from "tailwind.config";
import { ButtonPrimary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { GoToArrow } from "components/Icons/GoToArrow";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";

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

function PublicationSettingsButton(props: { publication: string }) {
  let isMobile = useIsMobile();
  let [state, setState] = useState<"menu" | "general" | "theme">("menu");
  let [loading, setLoading] = useState(false);

  return (
    <Popover
      asChild
      onOpenChange={() => setState("menu")}
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      className={`max-w-xs w-[1000px] ${state === "theme" && "bg-white!"}`}
      arrowFill={theme.colors["border-light"]}
      trigger={
        <ActionButton
          id="pub-settings-button"
          icon=<SettingsSmall />
          label="Settings"
        />
      }
    >
      {state === "general" ? (
        <EditPubForm
          backToMenuAction={() => setState("menu")}
          loading={loading}
          setLoadingAction={setLoading}
        />
      ) : state === "theme" ? (
        <PubThemeSetter
          backToMenu={() => setState("menu")}
          loading={loading}
          setLoading={setLoading}
        />
      ) : (
        <SettingsMenu
          state={state}
          setState={setState}
          loading={loading}
          setLoading={setLoading}
        />
      )}
    </Popover>
  );
}

const SettingsMenu = (props: {
  state: "menu" | "general" | "theme";
  setState: (s: typeof props.state) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
}) => {
  let menuItemClassName =
    "menuItem -mx-[8px] text-left flex items-center justify-between hover:no-underline!";

  return (
    <div className="flex flex-col gap-0.5">
      <PubSettingsHeader
        loading={props.loading}
        setLoadingAction={props.setLoading}
        state={"menu"}
      />
      <button
        className={menuItemClassName}
        type="button"
        onClick={() => {
          props.setState("general");
        }}
      >
        Settings
        <ArrowRightTiny />
      </button>
      <button
        className={menuItemClassName}
        type="button"
        onClick={() => props.setState("theme")}
      >
        Publication Theme
        <ArrowRightTiny />
      </button>
      <SpeedyLink
        className={menuItemClassName}
        href="https://about.leaflet.pub/
        "
      >
        About Leaflet
        <ArrowRightTiny />
      </SpeedyLink>
    </div>
  );
};

export const PubSettingsHeader = (props: {
  state: "menu" | "general" | "theme";
  backToMenuAction?: () => void;
  loading: boolean;
  setLoadingAction: (l: boolean) => void;
}) => {
  return (
    <div className="flex justify-between font-bold text-secondary bg-border-light -mx-3 -mt-2 px-3 pt-2 pb-1 mb-1">
      {props.state === "menu"
        ? "Settings"
        : props.state === "general"
          ? "General"
          : props.state === "theme"
            ? "Publication Theme"
            : ""}
      {props.state !== "menu" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              props.backToMenuAction && props.backToMenuAction();
            }}
          >
            <GoBackSmall className="text-accent-contrast" />
          </button>

          <ButtonPrimary compact type="submit">
            {props.loading ? <DotLoader /> : "Update"}
          </ButtonPrimary>
        </div>
      )}
    </div>
  );
};
