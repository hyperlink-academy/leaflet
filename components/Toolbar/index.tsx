"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { TextBlockTypeToolbar } from "./TextBlockTypeToolbar";
import { InlineLinkToolbar } from "./InlineLinkToolbar";
import { useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";
import { Fact, useEntity } from "src/replicache";
import * as Tooltip from "@radix-ui/react-tooltip";
import { addShortcut } from "src/shortcuts";
import { ListToolbar } from "./ListToolbar";
import { HighlightToolbar } from "./HighlightToolbar";
import { TextToolbar } from "./TextToolbar";
import { ImageToolbar } from "./ImageToolbar";
import { MultiselectToolbar } from "./MultiSelectToolbar";
import { TooltipButton } from "components/Buttons";
import { TextAlignmentToolbar } from "./TextAlignmentToolbar";
import { useIsMobile } from "src/hooks/isMobile";
import { CloseTiny } from "components/Icons/CloseTiny";

export type ToolbarTypes =
  | "default"
  | "multiselect"
  | "highlight"
  | "link"
  | "heading"
  | "text-alignment"
  | "list"
  | "image";

// The page type of the page the toolbar is acting on, provided once by the
// toolbar shell so each ToolbarButton doesn't need its own pair of
// focusedEntity + page/type subscriptions.
const ToolbarPageTypeContext = createContext<
  Fact<"page/type">["data"]["value"] | undefined
>(undefined);

export const ToolbarPageTypeProvider = (props: {
  pageID: string;
  children: React.ReactNode;
}) => {
  let pageType = useEntity(props.pageID, "page/type")?.data.value;
  return (
    <ToolbarPageTypeContext.Provider value={pageType}>
      {props.children}
    </ToolbarPageTypeContext.Provider>
  );
};

export const Toolbar = (props: {
  pageID: string;
  blockID: string;
  blockType: string | null | undefined;
}) => {
  let [toolbarState, setToolbarState] = useState<ToolbarTypes>("default");

  // The selection as a stable string key: re-renders (and re-runs the
  // mode-reset effect below) only when the selection's membership actually
  // changes, not on every store write that rebuilds the array.
  let selectionKey = useUIState((s) =>
    s.selectedBlocks.map((b) => b.entityID).join(" "),
  );
  let isMultiselect = useUIState((s) => s.selectedBlocks.length > 1);

  useEffect(() => {
    if (toolbarState !== "default") return;
    let removeShortcut = addShortcut({
      metaKey: true,
      key: "k",
      handler: () => {
        setToolbarState("link");
      },
    });
    return () => {
      removeShortcut();
    };
  }, [toolbarState]);

  let isTextBlock =
    props.blockType === "heading" ||
    props.blockType === "text" ||
    props.blockType === "blockquote";

  useEffect(() => {
    if (isMultiselect) {
      setToolbarState("multiselect");
      return;
    }
    if (isTextBlock) {
      setToolbarState("default");
    }
    if (props.blockType === "image") {
      setToolbarState("image");
    }
    if (props.blockType === "button" || props.blockType === "datetime") {
      setToolbarState("text-alignment");
    }
  }, [props.blockType, isMultiselect, selectionKey]);

  let isMobile = useIsMobile();
  return (
    <ToolbarPageTypeProvider pageID={props.pageID}>
      <Tooltip.Provider>
        <div
          className={`toolbar flex gap-2 items-center justify-between w-full
        ${isMobile ? "" : "h-[26px]"}`}
        >
          <div className="toolbarOptions flex gap-1 sm:gap-[6px] items-center grow">
            {toolbarState === "default" ? (
              <TextToolbar
                setToolbarState={(s) => {
                  setToolbarState(s);
                }}
              />
            ) : toolbarState === "highlight" ? (
              <HighlightToolbar
                pageID={props.pageID}
                onClose={() => setToolbarState("default")}
              />
            ) : toolbarState === "list" ? (
              <ListToolbar
                onClose={() =>
                  setToolbarState(isMultiselect ? "multiselect" : "default")
                }
              />
            ) : toolbarState === "link" ? (
              <InlineLinkToolbar
                onClose={() => {
                  useEditorStates
                    .getState()
                    .editorStates[props.blockID]?.view?.focus();
                  setToolbarState("default");
                }}
              />
            ) : toolbarState === "heading" ? (
              <TextBlockTypeToolbar
                onClose={() =>
                  setToolbarState(isMultiselect ? "multiselect" : "default")
                }
              />
            ) : toolbarState === "text-alignment" ? (
              <TextAlignmentToolbar />
            ) : toolbarState === "image" ? (
              <ImageToolbar setToolbarState={setToolbarState} />
            ) : toolbarState === "multiselect" ? (
              <MultiselectToolbar setToolbarState={setToolbarState} />
            ) : null}
          </div>
          <button
            className="toolbarBackToDefault hover:text-accent-contrast"
            onMouseDown={(e) => {
              e.preventDefault();
              if (
                toolbarState === "multiselect" ||
                toolbarState === "image" ||
                toolbarState === "default"
              ) {
                // close the toolbar
                useUIState.setState(() => ({
                  focusedEntity: {
                    entityType: "page",
                    entityID: props.pageID,
                  },
                  selectedBlocks: [],
                }));
              } else if (isMultiselect) {
                setToolbarState("multiselect");
              } else {
                if (props.blockType === "image") {
                  setToolbarState("image");
                }
                if (isTextBlock) {
                  setToolbarState("default");
                }
              }
            }}
          >
            <CloseTiny />
          </button>
        </div>
      </Tooltip.Provider>
    </ToolbarPageTypeProvider>
  );
};

export const ToolbarButton = (props: {
  className?: string;
  onClick?: (e: React.MouseEvent) => unknown;
  tooltipContent: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  hiddenOnCanvas?: boolean;
  tooltipClassName?: string;
}) => {
  let pageType = useContext(ToolbarPageTypeContext);
  if (pageType === "canvas" && props.hiddenOnCanvas) return null;
  return (
    <TooltipButton
      onMouseDown={async (e) => {
        e.preventDefault();
        props.onClick && (await props.onClick(e));
      }}
      disabled={props.disabled}
      tooltipContent={props.tooltipContent}
      tooltipClassName={props.tooltipClassName}
      className={`
        flex items-center rounded-md border border-transparent
        ${props.className}
        ${
          props.active && !props.disabled
            ? "bg-border-light text-primary"
            : props.disabled
              ? "text-border cursor-not-allowed"
              : "text-secondary  hover:text-primary hover:border-border  active:bg-border-light active:text-primary"
        }
        `}
    >
      {props.children}
    </TooltipButton>
  );
};
