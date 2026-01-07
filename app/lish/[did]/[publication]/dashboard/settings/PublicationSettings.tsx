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

type menuState = "menu" | "general" | "theme" | "post-options";

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
      ) : state === "post-options" ? (
        <PostOptions
          backToMenu={() => setState("menu")}
          loading={loading}
          setLoading={setLoading}
        />
      ) : (
        <PubSettingsMenu
          state={state}
          setState={setState}
          loading={loading}
          setLoading={setLoading}
        />
      )}
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
      <PubSettingsHeader
        loading={props.loading}
        setLoadingAction={props.setLoading}
        state={"menu"}
      >
        Settings
      </PubSettingsHeader>
      <button
        className={menuItemClassName}
        type="button"
        onClick={() => {
          props.setState("general");
        }}
      >
        General Settings
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
      {/*<button
        className={menuItemClassName}
        type="button"
        onClick={() => props.setState("post-options")}
      >
        Post Options
        <ArrowRightTiny />
      </button>*/}
    </div>
  );
};

export const PubSettingsHeader = (props: {
  state: menuState;
  backToMenuAction?: () => void;
  loading: boolean;
  setLoadingAction: (l: boolean) => void;
  children: React.ReactNode;
}) => {
  return (
    <div className="flex justify-between font-bold text-secondary bg-border-light -mx-3 -mt-2 px-3 py-2 mb-1">
      {props.children}
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
