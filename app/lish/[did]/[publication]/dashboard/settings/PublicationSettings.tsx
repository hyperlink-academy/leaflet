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
import { UpgradeContent } from "../../UpgradeModal";
import { Modal } from "components/Modal";
import { ManageProSubscription } from "./ManageProSubscription";
import { useIsPro } from "src/hooks/useEntitlement";

type menuState =
  | "menu"
  | "pub-settings"
  | "theme"
  | "post-settings"
  | "manage-subscription";

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
      ) : state === "manage-subscription" ? (
        <ManageProSubscription backToMenu={() => setState("menu")} />
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
  let isPro = useIsPro();

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
        Publiction Settings
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
          className={`${menuItemClassName} `}
          type="button"
          onClick={() => props.setState("manage-subscription")}
        >
          Manage Pro Subscription <ArrowRightTiny />{" "}
        </button>
      )}
    </div>
  );
};

export const PubSettingsHeader = (props: {
  backToMenuAction?: () => void;
  loading?: boolean;
  setLoadingAction?: (l: boolean) => void;
  children: React.ReactNode;
}) => {
  return (
    <div className="flex justify-between font-bold text-secondary bg-border-light -mx-3 -mt-2 px-3 py-2 mb-1">
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
