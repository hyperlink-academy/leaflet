"use client";

import React, { useEffect, useState } from "react";
import { TextBlockTypeToolbar } from "./TextBlockTypeToolbar";
import { InlineLinkToolbar } from "./InlineLinkToolbar";
import { useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";
import { useEntity, useReplicache } from "src/replicache";
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
  | "linkBlock"
  | "img-alt-text"
  | "image";

export const Toolbar = (props: {
  pageID: string;
  blockID: string;
  blockType: string | null | undefined;
}) => {
  let [toolbarState, setToolbarState] = useState<ToolbarTypes>("default");

  let activeEditor = useEditorStates((s) => s.editorStates[props.blockID]);
  let selectedBlocks = useUIState((s) => s.selectedBlocks);

  let lastUsedHighlight = useUIState((s) => s.lastUsedHighlight);
  let setLastUsedHighlight = (color: "1" | "2" | "3") =>
    useUIState.setState({
      lastUsedHighlight: color,
    });

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
    if (selectedBlocks.length > 1) {
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
    } else null;
  }, [props.blockType, selectedBlocks]);

  let isMobile = useIsMobile();
  return (
    <Tooltip.Provider>
      <div
        className={`toolbar flex gap-2 items-center justify-between w-full
        ${isMobile ? "h-[calc(15px+var(--safe-padding-bottom))]" : "h-[26px]"}`}
      >
        <div className="toolbarOptions flex gap-1 sm:gap-[6px] items-center grow">
          {toolbarState === "default" ? (
            <TextToolbar
              lastUsedHighlight={lastUsedHighlight}
              setToolbarState={(s) => {
                setToolbarState(s);
              }}
            />
          ) : toolbarState === "highlight" ? (
            <HighlightToolbar
              pageID={props.pageID}
              onClose={() => setToolbarState("default")}
              lastUsedHighlight={lastUsedHighlight}
              setLastUsedHighlight={(color: "1" | "2" | "3") =>
                setLastUsedHighlight(color)
              }
            />
          ) : toolbarState === "list" ? (
            <ListToolbar onClose={() => setToolbarState("default")} />
          ) : toolbarState === "link" ? (
            <InlineLinkToolbar
              onClose={() => {
                activeEditor?.view?.focus();
                setToolbarState("default");
              }}
            />
          ) : toolbarState === "heading" ? (
            <TextBlockTypeToolbar onClose={() => setToolbarState("default")} />
          ) : toolbarState === "text-alignment" ? (
            <TextAlignmentToolbar />
          ) : toolbarState === "image" ? (
            <ImageToolbar setToolbarState={setToolbarState} />
          ) : toolbarState === "multiselect" ? (
            <MultiselectToolbar setToolbarState={setToolbarState} />
          ) : null}
        </div>
        {/* if the thing is are you sure state, don't show the x... is each thing handling its own are you sure? theres no need for that */}

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
  );
};

export const ToolbarButton = (props: {
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  tooltipContent: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  hiddenOnCanvas?: boolean;
}) => {
  let focusedEntity = useUIState((s) => s.focusedEntity);
  let isDisabled = props.disabled;

  let focusedEntityType = useEntity(
    focusedEntity?.entityType === "page"
      ? focusedEntity.entityID
      : focusedEntity?.parent || null,
    "page/type",
  );
  if (focusedEntityType?.data.value === "canvas" && props.hiddenOnCanvas)
    return;
  return (
    <TooltipButton
      onMouseDown={(e) => {
        e.preventDefault();
        props.onClick && props.onClick(e);
      }}
      disabled={isDisabled}
      tooltipContent={props.tooltipContent}
      className={`
        flex items-center rounded-md border border-transparent
        ${props.className}
        ${
          props.active && !isDisabled
            ? "bg-border-light text-primary"
            : isDisabled
              ? "text-border cursor-not-allowed"
              : "text-secondary  hover:text-primary hover:border-border  active:bg-border-light active:text-primary"
        }
        `}
    >
      {props.children}
    </TooltipButton>
  );
};
