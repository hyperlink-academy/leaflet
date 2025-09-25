"use client";
import { ButtonSecondary } from "components/Buttons";
import { GoBackSmall } from "components/Icons/GoBackSmall";
import { GoToArrow } from "components/Icons/GoToArrow";
import { LogoutSmall } from "components/Icons/LogoutSmall";
import { Separator } from "components/Layout";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";
import { ThemeSetterContent } from "components/ThemeManager/ThemeSetter";
import { useState } from "react";
import { useReplicache } from "src/replicache";
import { mutate } from "swr";

type settings = "default" | "general" | "theme";

export const HomeSettings = (props: { cardBorderHidden?: boolean }) => {
  let [settingsState, setSettingsState] = useState("default");
  if (settingsState === "default")
    return (
      <div className="flex flex-col gap-2 w-full">
        <SettingSectionButton
          setSettingsState={setSettingsState}
          setting="general"
          label="General"
          cardBorderHidden={props.cardBorderHidden}
        />
        <SettingSectionButton
          setSettingsState={setSettingsState}
          setting="theme"
          label="Theme"
          cardBorderHidden={props.cardBorderHidden}
        />
      </div>
    );

  if (settingsState === "general")
    return (
      <div>
        <SettingsSectionGeneral setSettingsState={setSettingsState} />
      </div>
    );
  if (settingsState === "theme")
    return (
      <div>
        <SettingsSectionTheme setSettingsState={setSettingsState} />
      </div>
    );
};

export const SettingSectionButton = (props: {
  setSettingsState: (s: settings) => void;
  setting: settings;
  cardBorderHidden?: boolean;
  label: string;
}) => {
  return (
    <>
      <button
        onClick={() => props.setSettingsState(props.setting)}
        className={` w-full px-2 py-1 rounded-md flex justify-between items-center font-bold border ${props.cardBorderHidden ? " border-transparent" : "border-border-light  "}`}
        style={{
          backgroundColor: props.cardBorderHidden
            ? "transparent"
            : "rgba(var(--bg-page), var(--bg-page-alpha))",
        }}
      >
        {props.label}
        <GoToArrow />
      </button>
      {props.cardBorderHidden && (
        <div className="w-full px-1 last:hidden">
          <hr className="border-border" />
        </div>
      )}
    </>
  );
};

const BackToDefaultButton = (props: {
  setSettingsState: (s: settings) => void;
}) => {
  return (
    <button onClick={() => props.setSettingsState("default")}>
      <GoToArrow className="rotate-180" />
    </button>
  );
};

const SettingsSectionGeneral = (props: {
  setSettingsState: (s: settings) => void;
}) => {
  return (
    <div className="flex flex-col gap-3">
      <h4 className="flex justify-between">
        General
        <BackToDefaultButton setSettingsState={props.setSettingsState} />
      </h4>
      <ButtonSecondary
        fullWidth
        className="flex gap-2"
        onClick={async () => {
          await fetch("/api/auth/logout");
          mutate("identity", null);
        }}
      >
        <LogoutSmall />
        Logout
      </ButtonSecondary>
    </div>
  );
};

const SettingsSectionTheme = (props: {
  setSettingsState: (s: settings) => void;
}) => {
  let { rootEntity } = useReplicache();
  return (
    <div className="flex flex-col gap-2">
      <h4 className="flex justify-between gap-2 pl-2 ">
        Theme
        <BackToDefaultButton setSettingsState={props.setSettingsState} />
      </h4>
      <div className=" w-full ">
        <div className="bg-white px-2 pt-1 border  border-[#CCCCCC] rounded-md max-w-md w-full">
          <ThemeSetterContent home entityID={rootEntity} />
        </div>
        {/*<SamplePage home entityID={rootEntity} />*/}
      </div>
    </div>
  );
};
