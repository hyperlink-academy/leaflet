"use client";

import React, { useEffect, useState } from "react";
import {
  BoldSmall,
  CloseTiny,
  ItalicSmall,
  StrikethroughSmall,
  HighlightSmall,
  PopoverArrow,
  ArrowRightTiny,
} from "components/Icons";
import { schema } from "components/Blocks/TextBlock/schema";
import { TextDecorationButton } from "./TextDecorationButton";
import {
  keepFocus,
  TextBlockTypeButton,
  TextBlockTypeToolbar,
} from "./TextBlockTypeToolbar";
import { LinkButton, InlineLinkToolbar } from "./InlineLinkToolbar";
import { theme } from "../../tailwind.config";
import { useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";
import { useReplicache } from "src/replicache";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Separator, ShortcutKey } from "components/Layout";
import { metaKey } from "src/utils/metaKey";
import { isMac } from "@react-aria/utils";
import { addShortcut } from "src/shortcuts";
import { ListButton, ListToolbar } from "./ListToolbar";
import { HighlightToolbar } from "./HighlightToolbar";
import { TextToolbar } from "./TextToolbar";

export type ToolbarTypes =
  | "default"
  | "highlight"
  | "link"
  | "header"
  | "list"
  | "linkBlock";

export const Toolbar = (props: { cardID: string; blockID: string }) => {
  let { rep } = useReplicache();
  let focusedBlock = useUIState((s) => s.focusedBlock);

  let [toolbarState, setToolbarState] = useState<ToolbarTypes>("default");

  let lastUsedHighlight = useUIState((s) => s.lastUsedHighlight);
  let setLastUsedHighlight = (color: "1" | "2" | "3") =>
    useUIState.setState({
      lastUsedHighlight: color,
    });

  let activeEditor = useEditorStates((s) => s.editorStates[props.blockID]);

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

  return (
    <Tooltip.Provider>
      <div className="flex items-center justify-between w-full gap-6">
        <div className="flex gap-[6px] items-center grow">
          {toolbarState === "default" ? (
            <TextToolbar
              lastUsedHighlight={lastUsedHighlight}
              setToolbarState={(s) => {
                setToolbarState(s);
              }}
            />
          ) : toolbarState === "highlight" ? (
            <HighlightToolbar
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
          ) : toolbarState === "header" ? (
            <TextBlockTypeToolbar onClose={() => setToolbarState("default")} />
          ) : null}
        </div>
        <button
          className="hover:text-accent-contrast"
          onClick={() => {
            if (toolbarState === "default") {
              useUIState.setState(() => ({
                focusedBlock: {
                  type: "card",
                  entityID: props.cardID,
                },
                selectedBlock: [],
              }));
            } else {
              setToolbarState("default");
              focusedBlock && keepFocus(focusedBlock.entityID);
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
}) => {
  return (
    // toolbar button does not control the highlight theme setter
    // if toolbar button is updated, be sure to update there as well
    <Tooltip.Root>
      <Tooltip.Trigger
        disabled={props.disabled}
        className={`
          flex items-center rounded-md border border-transparent hover:border-border  active:bg-border-light active:text-primary
          ${props.className}
          ${
            props.active
              ? "bg-border-light text-primary"
              : props.disabled
                ? "text-border cursor-not-allowed"
                : "text-secondary  hover:text-primary"
          }
          `}
        onMouseDown={(e) => {
          e.preventDefault();
          props.onClick && props.onClick(e);
        }}
      >
        {props.children}
      </Tooltip.Trigger>

      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={6}
          alignOffset={12}
          className="z-10 bg-border rounded-md py-1 px-[6px] font-bold text-secondary text-sm"
        >
          {props.tooltipContent}
          {/*  fill={theme.colors["border"]}s */}
          <Tooltip.Arrow asChild width={16} height={8} viewBox="0 0 16 8">
            <PopoverArrow
              arrowFill={theme.colors["border"]}
              arrowStroke="transparent"
            />
          </Tooltip.Arrow>
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
