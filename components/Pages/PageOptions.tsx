"use client";

import React, { JSX, useState } from "react";
import { useUIState } from "src/useUIState";
import { useEntitySetContext } from "../EntitySetProvider";

import { useReplicache } from "src/replicache";

import { Media } from "../Media";
import { MenuItem, Menu } from "../Menu";
import { PageThemeSetter } from "../ThemeManager/PageThemeSetter";
import { PageShareMenu } from "./PageShareMenu";
import { useUndoState } from "src/undoManager";
import { CloseTiny } from "components/Icons/CloseTiny";
import { MoreOptionsTiny } from "components/Icons/MoreOptionsTiny";
import { PaintSmall } from "components/Icons/PaintSmall";
import { ShareSmall } from "components/Icons/ShareSmall";
import { useCardBorderHidden } from "./useCardBorderHidden";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";

export const PageOptionButton = ({
  children,
  secondary,
  className,
  disabled,
  ...props
}: {
  children: React.ReactNode;
  secondary?: boolean;
  className?: string;
  disabled?: boolean;
} & Omit<JSX.IntrinsicElements["button"], "content">) => {
  const cardBorderHidden = useCardBorderHidden();
  return (
    <button
      className={`
        pageOptionsTrigger
        shrink-0
        pt-[2px] h-5 w-5 p-0.5 mx-auto
        border border-border
        ${secondary ? "bg-border text-bg-page" : "bg-bg-page text-border"}
        ${disabled && "opacity-50"}
        ${cardBorderHidden ? "rounded-md" : `rounded-b-md sm:rounded-l-none sm:rounded-r-md`}
        flex items-center justify-center
        ${className}

        `}
      {...props}
    >
      {children}
    </button>
  );
};

export const PageOptions = (props: {
  entityID: string;
  first: boolean | undefined;
  isFocused: boolean;
}) => {
  return (
    <div
      className={`pageOptions w-fit z-10
        ${props.isFocused ? "block" : "sm:hidden block"}
        absolute sm:-right-[19px] right-3 sm:top-3 top-0
        flex sm:flex-col flex-row-reverse gap-1 items-start`}
    >
      {!props.first && (
        <PageOptionButton
          secondary
          onClick={() => {
            useUIState.getState().closePage(props.entityID);
          }}
        >
          <CloseTiny />
        </PageOptionButton>
      )}
      <OptionsMenu entityID={props.entityID} first={!!props.first} />
      <UndoButtons />
    </div>
  );
};

export const UndoButtons = () => {
  let undoState = useUndoState();
  let { undoManager } = useReplicache();
  return (
    <Media mobile>
      {undoState.canUndo && (
        <div className="gap-1 flex sm:flex-col">
          <PageOptionButton secondary onClick={() => undoManager.undo()}>
            <UndoTiny />
          </PageOptionButton>

          <PageOptionButton
            secondary
            onClick={() => undoManager.redo()}
            disabled={!undoState.canRedo}
          >
            <RedoTiny />
          </PageOptionButton>
        </div>
      )}
    </Media>
  );
};

export const OptionsMenu = (props: { entityID: string; first: boolean }) => {
  let [state, setState] = useState<"normal" | "theme" | "share">("normal");
  let { permissions } = useEntitySetContext();
  if (!permissions.write) return null;

  let { data: pub, mutate } = useLeafletPublicationData();
  if (pub && props.first) return;
  return (
    <Menu
      align="end"
      asChild
      onOpenChange={(open) => {
        if (!open) setState("normal");
      }}
      trigger={
        <PageOptionButton className="!w-8 !h-5 sm:!w-5 sm:!h-8">
          <MoreOptionsTiny className="sm:rotate-90" />
        </PageOptionButton>
      }
    >
      {state === "normal" ? (
        <>
          {!props.first && (
            <MenuItem
              onSelect={(e) => {
                e.preventDefault();
                setState("share");
              }}
            >
              <ShareSmall /> Share Page
            </MenuItem>
          )}
          {!pub && (
            <MenuItem
              onSelect={(e) => {
                e.preventDefault();
                setState("theme");
              }}
            >
              <PaintSmall /> Theme Page
            </MenuItem>
          )}
        </>
      ) : state === "theme" ? (
        <PageThemeSetter entityID={props.entityID} />
      ) : state === "share" ? (
        <PageShareMenu entityID={props.entityID} />
      ) : null}
    </Menu>
  );
};

const UndoTiny = () => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.98775 3.14543C6.37828 2.75491 6.37828 2.12174 5.98775 1.73122C5.59723 1.34069 4.96407 1.34069 4.57354 1.73122L1.20732 5.09744C0.816798 5.48796 0.816798 6.12113 1.20732 6.51165L4.57354 9.87787C4.96407 10.2684 5.59723 10.2684 5.98775 9.87787C6.37828 9.48735 6.37828 8.85418 5.98775 8.46366L4.32865 6.80456H9.6299C12.1732 6.80456 13.0856 8.27148 13.0856 9.21676C13.0856 9.84525 12.8932 10.5028 12.5318 10.9786C12.1942 11.4232 11.6948 11.7367 10.9386 11.7367H9.43173C8.87944 11.7367 8.43173 12.1844 8.43173 12.7367C8.43173 13.2889 8.87944 13.7367 9.43173 13.7367H10.9386C12.3587 13.7367 13.4328 13.0991 14.1246 12.1883C14.7926 11.3086 15.0856 10.2062 15.0856 9.21676C15.0856 6.92612 13.0205 4.80456 9.6299 4.80456L4.32863 4.80456L5.98775 3.14543Z"
        fill="currentColor"
      />
    </svg>
  );
};

const RedoTiny = () => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.0122 3.14543C9.62172 2.75491 9.62172 2.12174 10.0122 1.73122C10.4028 1.34069 11.0359 1.34069 11.4265 1.73122L14.7927 5.09744C15.1832 5.48796 15.1832 6.12113 14.7927 6.51165L11.4265 9.87787C11.0359 10.2684 10.4028 10.2684 10.0122 9.87787C9.62172 9.48735 9.62172 8.85418 10.0122 8.46366L11.6713 6.80456H6.3701C3.82678 6.80456 2.91443 8.27148 2.91443 9.21676C2.91443 9.84525 3.10681 10.5028 3.46817 10.9786C3.8058 11.4232 4.30523 11.7367 5.06143 11.7367H6.56827C7.12056 11.7367 7.56827 12.1844 7.56827 12.7367C7.56827 13.2889 7.12056 13.7367 6.56827 13.7367H5.06143C3.6413 13.7367 2.56723 13.0991 1.87544 12.1883C1.20738 11.3086 0.914429 10.2062 0.914429 9.21676C0.914429 6.92612 2.97946 4.80456 6.3701 4.80456L11.6714 4.80456L10.0122 3.14543Z"
        fill="currentColor"
      />
    </svg>
  );
};
