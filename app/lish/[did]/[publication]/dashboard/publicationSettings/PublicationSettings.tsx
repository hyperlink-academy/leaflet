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
import { PubContributorManager } from "./PublicationContributors";

type state = "menu" | "general" | "theme" | "contributors";

export function PublicationSettingsButton(props: { publication: string }) {
  let isMobile = useIsMobile();
  let [state, setState] = useState<state>("menu");
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
      ) : state === "contributors" ? (
        <PubContributorManager backToMenuAction={() => setState("menu")} />
      ) : (
        <PubSettingsMenu state={state} setState={setState} />
      )}
    </Popover>
  );
}

const PubSettingsMenu = (props: {
  state: "menu" | "general" | "theme" | "contributors";
  setState: (s: state) => void;
}) => {
  return (
    <div className="flex flex-col gap-0.5">
      <PubSettingsHeader state={"menu"}>Settings</PubSettingsHeader>

      <PubSettingsMenuItem setState={() => props.setState("general")}>
        Publication Settings
      </PubSettingsMenuItem>

      <PubSettingsMenuItem setState={() => props.setState("theme")}>
        Publication Theme
      </PubSettingsMenuItem>

      <PubSettingsMenuItem setState={() => props.setState("contributors")}>
        Contributors
      </PubSettingsMenuItem>
    </div>
  );
};

const PubSettingsMenuItem = (props: {
  children: React.ReactNode;
  setState: () => void;
}) => {
  return (
    <button
      className="menuItem -mx-[8px] text-left flex items-center justify-between hover:no-underline!"
      type="button"
      onClick={() => props.setState()}
    >
      {props.children} <ArrowRightTiny />
    </button>
  );
};

export const PubSettingsHeader = (props: {
  state: state;
  backToMenuAction?: () => void;
  loading?: boolean;
  noCTA?: boolean;
  children: React.ReactNode;
}) => {
  return (
    <div className="flex justify-between font-bold text-secondary bg-border-light -mx-3 -mt-2 px-3 py-2 mb-1">
      {props.children}

      <div className="flex gap-2">
        {props.state !== "menu" && (
          <button
            type="button"
            onClick={() => {
              props.backToMenuAction && props.backToMenuAction();
            }}
          >
            <GoBackSmall className="text-accent-contrast" />
          </button>
        )}
        {props.loading !== undefined && (
          <ButtonPrimary compact type="submit">
            {props.loading ? <DotLoader /> : "Update"}
          </ButtonPrimary>
        )}
      </div>
    </div>
  );
};
