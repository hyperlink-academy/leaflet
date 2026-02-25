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
import { ManageProSubscription } from "app/lish/[did]/[publication]/dashboard/settings/ManageProSubscription";
import { Modal } from "components/Modal";
import { UpgradeContent } from "app/lish/[did]/[publication]/UpgradeModal";
import { useIsPro } from "src/hooks/useEntitlement";

export const AccountSettings = (props: { entityID: string }) => {
  let [state, setState] = useState<
    "menu" | "general" | "theme" | "manage-subscription"
  >("menu");
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
      ) : state === "manage-subscription" ? (
        <ManageProSubscription backToMenu={() => setState("menu")} />
      ) : (
        <SettingsMenu state={state} setState={setState} />
      )}
    </Popover>
  );
};

const SettingsMenu = (props: {
  state: "menu" | "general" | "theme" | "manage-subscription";
  setState: (s: typeof props.state) => void;
}) => {
  let menuItemClassName =
    "menuItem -mx-[8px] text-left flex items-center justify-between hover:no-underline!";

  let isPro = useIsPro();

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
        General
        <ArrowRightTiny />
      </button>
      <button
        className={menuItemClassName}
        type="button"
        onClick={() => props.setState("theme")}
      >
        Account Theme
        <ArrowRightTiny />
      </button>
      {!isPro ? (
        <Modal
          trigger={
            <div
              className={`${menuItemClassName} bg-[var(--accent-light)]! border border-transparent hover:border-accent-contrast`}
            >
              Get Leaflet Pro
              <ArrowRightTiny />{" "}
            </div>
          }
        >
          <UpgradeContent />
        </Modal>
      ) : (
        <button
          className={`${menuItemClassName}`}
          type="button"
          onClick={() => props.setState("manage-subscription")}
        >
          Manage Pro Subscription <ArrowRightTiny />{" "}
        </button>
      )}
    </div>
  );
};

const GeneralSettings = (props: { backToMenu: () => void }) => {
  return (
    <div className="flex flex-col gap-0.5">
      <AccountSettingsHeader
        state={"general"}
        backToMenuAction={() => props.backToMenu()}
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
        backToMenuAction={() => props.backToMenu()}
      />
      <ThemeSetterContent entityID={props.entityID} home />
    </div>
  );
};
export const AccountSettingsHeader = (props: {
  state: "menu" | "general" | "theme";
  backToMenuAction?: () => void;
}) => {
  return (
    <div className="flex justify-between font-bold text-secondary bg-border-light -mx-3 -mt-2 px-3 py-2 mb-1">
      {props.state === "menu"
        ? "Settings"
        : props.state === "general"
          ? "General"
          : props.state === "theme"
            ? "Account Theme"
            : ""}
      {props.backToMenuAction && (
        <button
          type="button"
          onClick={() => {
            props.backToMenuAction && props.backToMenuAction();
          }}
        >
          <GoBackSmall className="text-accent-contrast" />
        </button>
      )}
    </div>
  );
};
