"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  BoldSmall,
  CloseTiny,
  ItalicSmall,
  UndoSmall,
  ListUnorderedSmall,
  ListOrderedSmall,
  ListIndentDecreaseSmall,
  ListIndentIncreaseSmall,
  BlockImageSmall,
  BlockLinkSmall,
  BlockCardSmall,
  BlockSmall,
  StrikethroughSmall,
  HighlightSmall,
  CheckTiny,
  PopoverArrow,
  ArrowRightTiny,
} from "components/Icons";
import { create } from "zustand";
import { combine } from "zustand/middleware";
import { schema } from "components/Blocks/TextBlock/schema";
import { TextDecorationButton } from "./TextDecorationButton";
import {
  keepFocus,
  TextBlockTypeButton,
  TextBlockTypeButtons,
} from "./TextBlockTypeButtons";
import { LinkButton, LinkEditor } from "./LinkButton";
import {
  HighlightColorButton,
  HighlightColorSettings,
} from "./HighlightButton";
import { theme } from "../../tailwind.config";
import { useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";
import { useEntity, useReplicache } from "src/replicache";
import { addImage } from "src/utils/addImage";
import { scanIndex } from "src/replicache/utils";
import { v7 } from "uuid";
import { useEntitySetContext } from "components/EntitySetProvider";
import { generateKeyBetween } from "fractional-indexing";
import { focusCard } from "components/Cards";
import { addLinkBlock } from "src/utils/addLinkBlock";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Separator, ShortcutKey } from "components/Layout";
import { Input } from "components/Input";
import { metaKey } from "src/utils/metaKey";
import { isMac } from "@react-aria/utils";
import { addShortcut } from "src/shortcuts";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { indent, outdent } from "src/utils/list-operations";

export const TextToolbar = (props: { cardID: string; blockID: string }) => {
  let { rep } = useReplicache();
  let focusedBlock = useUIState((s) => s.focusedBlock);

  let [toolbarState, setToolbarState] = useState<
    "default" | "highlight" | "link" | "header" | "list" | "linkBlock"
  >("default");

  let [lastUsedHighlight, setlastUsedHighlight] = useState<"1" | "2" | "3">(
    "1",
  );

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
            <>
              <TextDecorationButton
                tooltipContent={
                  <div className="flex flex-col gap-1 justify-center">
                    <div className="text-center">Bold </div>
                    <div className="flex gap-1">
                      <ShortcutKey>{metaKey()}</ShortcutKey> +{" "}
                      <ShortcutKey> B </ShortcutKey>
                    </div>
                  </div>
                }
                mark={schema.marks.strong}
                icon={<BoldSmall />}
              />
              <TextDecorationButton
                tooltipContent=<div className="flex flex-col gap-1 justify-center">
                  <div className="italic font-normal text-center">Italic</div>
                  <div className="flex gap-1">
                    <ShortcutKey>{metaKey()}</ShortcutKey> +{" "}
                    <ShortcutKey> I </ShortcutKey>
                  </div>
                </div>
                mark={schema.marks.em}
                icon={<ItalicSmall />}
              />
              <TextDecorationButton
                tooltipContent={
                  <div className="flex flex-col gap-1 justify-center">
                    <div className="text-center font-normal line-through">
                      Strikethrough
                    </div>
                    <div className="flex gap-1">
                      <ShortcutKey>{metaKey()}</ShortcutKey> +{" "}
                      <ShortcutKey> Cmd </ShortcutKey> +{" "}
                      <ShortcutKey> X </ShortcutKey>
                    </div>
                  </div>
                }
                mark={schema.marks.strikethrough}
                icon={<StrikethroughSmall />}
              />
              <div className="flex items-center gap-1">
                <TextDecorationButton
                  tooltipContent={
                    <div className="flex flex-col gap-1 justify-center">
                      <div className="text-center bg-border-light w-fit rounded-md px-0.5 mx-auto ">
                        Highlight
                      </div>
                      <div className="flex gap-1">
                        $
                        {isMac() ? (
                          <>
                            <ShortcutKey> Ctrl </ShortcutKey> +{" "}
                            <ShortcutKey> Cmd </ShortcutKey> +{" "}
                            <ShortcutKey> H </ShortcutKey>
                          </>
                        ) : (
                          <>
                            <ShortcutKey> Ctrl </ShortcutKey> +{" "}
                            <ShortcutKey> Meta </ShortcutKey> +{" "}
                            <ShortcutKey> H </ShortcutKey>
                          </>
                        )}
                      </div>
                    </div>
                  }
                  attrs={{ color: lastUsedHighlight }}
                  mark={schema.marks.highlight}
                  icon={
                    <HighlightSmall
                      highlightColor={
                        lastUsedHighlight === "1"
                          ? theme.colors["highlight-1"]
                          : lastUsedHighlight === "2"
                            ? theme.colors["highlight-2"]
                            : theme.colors["highlight-3"]
                      }
                    />
                  }
                />

                <ToolbarButton
                  tooltipContent="Change Highlight Color"
                  onClick={() => {
                    setToolbarState("highlight");
                  }}
                  className="-ml-1"
                >
                  <ArrowRightTiny />
                  {/* <div
                    className={`w-2 h-[22px] rounded-[2px] border border-border`}
                    style={{
                      backgroundColor:
                        lastUsedHighlight === "1"
                          ? theme.colors["highlight-1"]
                          : lastUsedHighlight === "2"
                            ? theme.colors["highlight-2"]
                            : theme.colors["highlight-3"],
                    }}
                  /> */}
                </ToolbarButton>
              </div>
              <ListToolbar />

              <Separator classname="h-6" />
              <LinkButton setToolBarState={setToolbarState} />
              <Separator classname="h-6" />
              <TextBlockTypeButton setToolbarState={setToolbarState} />
            </>
          ) : toolbarState === "highlight" ? (
            <HighlightToolbar
              onClose={() => setToolbarState("default")}
              lastUsedHighlight={lastUsedHighlight}
              setLastUsedHighlight={(color: "1" | "2" | "3") =>
                setlastUsedHighlight(color)
              }
            />
          ) : toolbarState === "link" ? (
            <LinkEditor
              onClose={() => {
                activeEditor?.view?.focus();
                setToolbarState("default");
              }}
            />
          ) : toolbarState === "header" ? (
            <TextBlockTypeButtons onClose={() => setToolbarState("default")} />
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

const HighlightToolbar = (props: {
  onClose: () => void;
  lastUsedHighlight: "1" | "2" | "3";
  setLastUsedHighlight: (color: "1" | "2" | "3") => void;
}) => {
  let focusedBlock = useUIState((s) => s.focusedBlock);
  let focusedEditor = useEditorStates((s) =>
    focusedBlock ? s.editorStates[focusedBlock.entityID] : null,
  );
  let [initialRender, setInitialRender] = useState(true);
  useEffect(() => {
    setInitialRender(false);
  }, []);
  useEffect(() => {
    if (initialRender) return;
    if (focusedEditor) props.onClose();
  }, [focusedEditor, props]);
  return (
    <div className="flex w-full justify-between items-center gap-4 text-secondary">
      <div className="flex items-center gap-[6px]">
        <HighlightColorButton
          color="1"
          lastUsedHighlight={props.lastUsedHighlight}
          setLastUsedHightlight={props.setLastUsedHighlight}
        />
        <HighlightColorButton
          color="2"
          lastUsedHighlight={props.lastUsedHighlight}
          setLastUsedHightlight={props.setLastUsedHighlight}
        />
        <HighlightColorButton
          color="3"
          lastUsedHighlight={props.lastUsedHighlight}
          setLastUsedHightlight={props.setLastUsedHighlight}
        />
        <Separator classname="h-6" />
        <HighlightColorSettings />
      </div>
    </div>
  );
};

const ListToolbar = () => {
  // This Toolbar should close once the user starts typing again
  let focusedBlock = useUIState((s) => s.focusedBlock);
  let isList = useEntity(focusedBlock?.entityID || null, "block/is-list");
  let siblings = useBlocks(
    focusedBlock?.type === "block" ? focusedBlock.parent : null,
  );
  let block = siblings.find((s) => s.value === focusedBlock?.entityID);
  let previousBlock =
    siblings[siblings.findIndex((b) => b.value === focusedBlock?.entityID) - 1];
  let { rep } = useReplicache();
  if (!isList?.data.value)
    return (
      <div className="flex w-full justify-between items-center gap-4">
        <ToolbarButton
          tooltipContent={<div>Indent List Item</div>}
          onClick={() => {
            if (!focusedBlock) return;
            rep?.mutate.assertFact({
              entity: focusedBlock?.entityID,
              attribute: "block/is-list",
              data: { value: true, type: "boolean" },
            });
          }}
        >
          <ListUnorderedSmall />
        </ToolbarButton>
      </div>
    );

  return (
    <div className="flex w-full justify-between items-center gap-4">
      <div className="flex items-center gap-[6px]">
        <Separator classname="h-6" />
        <ToolbarButton
          tooltipContent={<div>Indent List Item</div>}
          disabled={
            !previousBlock?.listData ||
            previousBlock.listData.depth !== block?.listData?.depth
          }
          onClick={() => {
            if (!rep || !block || !previousBlock) return;
            indent(block, previousBlock, rep);
          }}
        >
          <ListIndentIncreaseSmall />
        </ToolbarButton>
        <ToolbarButton
          tooltipContent={<div>Outdent List Item</div>}
          onClick={() => {
            if (!rep || !block) return;
            outdent(block, previousBlock, rep);
          }}
        >
          <ListIndentDecreaseSmall />
        </ToolbarButton>
      </div>
    </div>
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
