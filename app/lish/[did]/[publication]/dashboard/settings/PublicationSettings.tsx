"use client";

import { ActionButton } from "components/ActionBar/ActionButton";
import { Popover } from "components/Popover";
import { SettingsSmall } from "components/Icons/SettingsSmall";
import { EditPubForm } from "app/lish/createPub/UpdatePubForm";
import { PubThemeSetter } from "components/ThemeManager/PubThemeSetter";
import { useIsMobile } from "src/hooks/isMobile";
import { useState } from "react";
import { GoBackSmall } from "components/Icons/GoBackSmall";
import { theme } from "tailwind.config";
import { ButtonPrimary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { PostOptions } from "./PostOptions";
import { PublicationDomains } from "components/Domains/PublicationDomains";
import { usePublicationData } from "../PublicationSWRProvider";

type menuState = "menu" | "pub-settings" | "theme" | "post-settings" | "domains";

export function PublicationSettingsButton(props: { publication: string }) {
  let isMobile = useIsMobile();
  let [state, setState] = useState<menuState>("menu");
  let [loading, setLoading] = useState(false);

  return (
    <Popover
      asChild
      onOpenChange={() => setState("menu")}
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      className={`flex flex-col max-w-xs w-[1000px] ${state === "theme" && "bg-white!"} pb-0!`}
      arrowFill={theme.colors["border-light"]}
      trigger={
        <ActionButton
          id="pub-settings-button"
          icon=<SettingsSmall />
          label="Settings"
          smallOnMobile
        />
      }
    >
      {state === "pub-settings" ? (
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
      ) : state === "post-settings" ? (
        <PostOptions
          backToMenu={() => setState("menu")}
          loading={loading}
          setLoading={setLoading}
        />
      ) : state === "domains" ? (
        <PublicationDomainsView backToMenu={() => setState("menu")} />
      ) : (
        <PubSettingsMenu
          state={state}
          setState={setState}
          loading={loading}
          setLoading={setLoading}
        />
      )}
      <div className="spacer h-2 w-full" aria-hidden />
    </Popover>
  );
}

const PubSettingsMenu = (props: {
  state: menuState;
  setState: (s: menuState) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
}) => {
  let menuItemClassName =
    "menuItem -mx-[8px] text-left flex items-center justify-between hover:no-underline!";

  return (
    <div className="flex flex-col gap-0.5">
      <PubSettingsHeader>Settings</PubSettingsHeader>
      <button
        className={menuItemClassName}
        type="button"
        onClick={() => {
          props.setState("pub-settings");
        }}
      >
        Publication Settings
        <ArrowRightTiny />
      </button>
      <button
        className={menuItemClassName}
        type="button"
        onClick={() => props.setState("post-settings")}
      >
        Post Settings
        <ArrowRightTiny />
      </button>
      <button
        className={menuItemClassName}
        type="button"
        onClick={() => props.setState("theme")}
      >
        Theme and Layout
        <ArrowRightTiny />
      </button>
      <button
        className={menuItemClassName}
        type="button"
        onClick={() => props.setState("domains")}
      >
        Domains
        <ArrowRightTiny />
      </button>
    </div>
  );
};

function PublicationDomainsView(props: { backToMenu: () => void }) {
  let { data } = usePublicationData();
  let { publication: pubData } = data || {};
  if (!pubData) return null;
  return (
    <PublicationDomains
      backToMenu={props.backToMenu}
      publication_uri={pubData.uri}
    />
  );
}

export const PubSettingsHeader = (props: {
  backToMenuAction?: () => void;
  loading?: boolean;
  setLoadingAction?: (l: boolean) => void;
  children: React.ReactNode;
}) => {
  return (
    <div className="flex justify-between font-bold text-secondary bg-border-light -mx-3 -mt-2 px-3 py-2 mb-1 flex-shrink-0">
      {props.children}
      {props.backToMenuAction && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              props.backToMenuAction && props.backToMenuAction();
            }}
          >
            <GoBackSmall className="text-accent-contrast" />
          </button>
          {props.setLoadingAction && (
            <ButtonPrimary compact type="submit">
              {props.loading ? <DotLoader /> : "Update"}
            </ButtonPrimary>
          )}
        </div>
      )}
    </div>
  );
};
