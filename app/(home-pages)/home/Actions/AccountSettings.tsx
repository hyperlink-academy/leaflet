"use client";

import { ActionButton } from "components/ActionBar/ActionButton";
import { mutate } from "swr";
import { AccountSmall } from "components/Icons/AccountSmall";
import { LogoutSmall } from "components/Icons/LogoutSmall";
import { Popover } from "components/Popover";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { SpeedyLink } from "components/SpeedyLink";
import { GoBackSmall } from "components/Icons/GoBackSmall";
import { useState } from "react";
import { ThemeSetterContent } from "components/ThemeManager/ThemeSetter";
import { useIsMobile } from "src/hooks/isMobile";

export const AccountSettings = (props: { entityID: string }) => {
  let [state, setState] = useState<"menu" | "general" | "theme">("menu");
  let isMobile = useIsMobile();

  return (
    <Popover
      asChild
      onOpenChange={() => setState("menu")}
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      className={`max-w-xs w-[1000px] ${state === "theme" && "bg-white!"}`}
      trigger={<ActionButton icon=<AccountSmall /> label="Settings" />}
    >
      {state === "general" ? (
        <GeneralSettings backToMenu={() => setState("menu")} />
      ) : state === "theme" ? (
        <AccountThemeSettings
          entityID={props.entityID}
          backToMenu={() => setState("menu")}
        />
      ) : (
        <SettingsMenu state={state} setState={setState} />
      )}
    </Popover>
  );
};

const SettingsMenu = (props: {
  state: "menu" | "general" | "theme";
  setState: (s: typeof props.state) => void;
}) => {
  let menuItemClassName =
    "menuItem -mx-[8px] text-left flex items-center justify-between";

  return (
    <div className="flex flex-col gap-0.5">
      <AccountSettingsHeader state={"menu"} />
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
        Theme
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

const GeneralSettings = (props: { backToMenu: () => void }) => {
  return (
    <div className="flex flex-col gap-0.5">
      <AccountSettingsHeader
        state={"general"}
        backToMenu={() => props.backToMenu()}
      />

      <button
        className="flex gap-2 font-bold"
        onClick={async () => {
          await fetch("/api/auth/logout");
          mutate("identity", null);
        }}
      >
        <LogoutSmall />
        Logout
      </button>
    </div>
  );
};
const AccountThemeSettings = (props: {
  entityID: string;
  backToMenu: () => void;
}) => {
  return (
    <div className="flex flex-col gap-0.5">
      <AccountSettingsHeader
        state={"theme"}
        backToMenu={() => props.backToMenu()}
      />
      <ThemeSetterContent entityID={props.entityID} home />
    </div>
  );
};
export const AccountSettingsHeader = (props: {
  state: "menu" | "general" | "theme";
  backToMenu?: () => void;
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
      {props.backToMenu && (
        <button
          type="button"
          onClick={() => {
            props.backToMenu && props.backToMenu();
          }}
        >
          <GoBackSmall className="text-accent-contrast" />
        </button>
      )}
    </div>
  );
};
