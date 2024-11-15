"use client";

import React, { useEffect, useState } from "react";
import { CloseTiny, PopoverArrow } from "components/Icons";
import { keepFocus, TextBlockTypeToolbar } from "./TextBlockTypeToolbar";
import { InlineLinkToolbar } from "./InlineLinkToolbar";
import { theme } from "../../tailwind.config";
import { useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";
import { useEntity, useReplicache } from "src/replicache";
import * as Tooltip from "@radix-ui/react-tooltip";
import { addShortcut } from "src/shortcuts";
import { ListToolbar } from "./ListToolbar";
import { HighlightToolbar } from "./HighlightToolbar";
import { TextToolbar } from "./TextToolbar";
import { BlockToolbar } from "./BlockToolbar";
import { MultiselectToolbar } from "./MultiSelectToolbar";
import { focusPage } from "components/Pages";
import { AreYouSure, deleteBlock } from "components/Blocks/DeleteBlock";
import { TooltipButton } from "components/Buttons";
import { TextAlignmentToolbar } from "./TextAlignmentToolbar";

export type ToolbarTypes =
  | "areYouSure"
  | "default"
  | "highlight"
  | "link"
  | "heading"
  | "text-alignment"
  | "list"
  | "linkBlock"
  | "block"
  | "multiselect";

export const Toolbar = (props: { pageID: string; blockID: string }) => {
  let { rep } = useReplicache();

  let [toolbarState, setToolbarState] = useState<ToolbarTypes>("default");

  let focusedEntity = useUIState((s) => s.focusedEntity);
  let selectedBlocks = useUIState((s) => s.selectedBlocks);
  let activeEditor = useEditorStates((s) => s.editorStates[props.blockID]);

  let blockType = useEntity(props.blockID, "block/type")?.data.value;

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

  useEffect(() => {
    if (!blockType) return;
    if (blockType !== "heading" && blockType !== "text") {
      setToolbarState("block");
    } else {
      setToolbarState("default");
    }
  }, [blockType]);

  useEffect(() => {
    if (selectedBlocks.length > 1 && toolbarState !== "areYouSure") {
      setToolbarState("multiselect");
    } else if (toolbarState === "multiselect") {
      setToolbarState("default");
    }
  }, [selectedBlocks.length, toolbarState]);

  return (
    <Tooltip.Provider>
      <div className="toolbar flex items-center justify-between w-full  h-[26px]">
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
          ) : toolbarState === "block" ? (
            <BlockToolbar setToolbarState={setToolbarState} />
          ) : toolbarState === "multiselect" ? (
            <MultiselectToolbar setToolbarState={setToolbarState} />
          ) : toolbarState === "areYouSure" ? (
            <AreYouSure
              compact
              type={blockType}
              entityID={selectedBlocks.map((b) => b.value)}
              onClick={() => {
                rep &&
                  deleteBlock(
                    selectedBlocks.map((b) => b.value),
                    rep,
                  );
              }}
              closeAreYouSure={() => {
                let state: ToolbarTypes =
                  selectedBlocks.length > 1
                    ? "multiselect"
                    : blockType !== "heading" && blockType !== "text"
                      ? "block"
                      : "default";
              }}
            />
          ) : null}
        </div>
        {/* if the thing is are you sure state, don't show the x... is each thing handling its own are you sure? theres no need for that */}
        {toolbarState !== "areYouSure" && (
          <button
            className="toolbarBackToDefault hover:text-accent-contrast"
            onMouseDown={(e) => {
              e.preventDefault();
              if (
                toolbarState === "multiselect" ||
                toolbarState === "block" ||
                toolbarState === "default"
              ) {
                useUIState.setState(() => ({
                  focusedEntity: {
                    entityType: "page",
                    entityID: props.pageID,
                  },
                  selectedBlocks: [],
                }));
              } else {
                setToolbarState("default");
                focusedEntity && keepFocus(focusedEntity.entityID);
              }
            }}
          >
            <CloseTiny />
          </button>
        )}
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
}) => {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let isLocked = useEntity(focusedBlock?.entityID || null, "block/is-locked");
  let isDisabled =
    props.disabled === undefined ? !!isLocked?.data.value : props.disabled;

  return (
    <TooltipButton
      onMouseDown={(e) => {
        e.preventDefault();
        props.onClick && props.onClick(e);
      }}
      disabled={isDisabled}
      content={props.tooltipContent}
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
