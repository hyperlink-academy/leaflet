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
} from "components/Icons";
import { create } from "zustand";
import { combine } from "zustand/middleware";
import { schema } from "components/Blocks/TextBlock/schema";
import { TextDecorationButton } from "./TextDecorationButton";
import {
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
import { useReplicache } from "src/replicache";
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

export const TextToolbar = (props: { cardID: string; blockID: string }) => {
  let { rep } = useReplicache();

  let [toolbarState, setToolbarState] = useState<
    "default" | "highlight" | "link" | "header" | "list" | "block" | "linkBlock"
  >("default");

  let [lastUsedHighlight, setlastUsedHighlight] = useState<"1" | "2" | "3">(
    "1",
  );

  let activeEditor = useEditorStates((s) => s.editorStates[props.blockID]);
  let editorState = activeEditor?.editor;
  let selected = useUIState((s) =>
    s.selectedBlock.find((b) => b.value === props.blockID),
  );

  let focusedBlock = useUIState((s) => s.focusedBlock);

  let blockEmpty = editorState?.doc.textContent.length === 0;

  useEffect(() => {
    if (blockEmpty && selected) {
      setToolbarState("block");
    } else setToolbarState("default");
  }, [blockEmpty, selected]);

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
                  icon={<HighlightSmall />}
                />
                <button
                  onClick={() => {
                    setToolbarState("highlight");
                  }}
                  className="pr-2"
                >
                  <div
                    className={`w-2 h-[22px] rounded-[2px] border border-border`}
                    style={{
                      backgroundColor:
                        lastUsedHighlight === "1"
                          ? theme.colors["highlight-1"]
                          : lastUsedHighlight === "2"
                            ? theme.colors["highlight-2"]
                            : theme.colors["highlight-3"],
                    }}
                  />
                </button>
              </div>

              <Separator classname="h-6" />
              {/* possibly link is only available if text is actively selected  */}
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
          ) : toolbarState === "block" ? (
            <BlockToolbar
              setToolbarState={setToolbarState}
              onClose={() => {
                if (blockEmpty)
                  useUIState.setState(() => ({
                    focusedBlock: {
                      type: "card",
                      entityID: props.cardID,
                    },
                    selectedBlock: [],
                  }));
                setToolbarState("default");
              }}
            />
          ) : toolbarState === "linkBlock" ? (
            <LinkBlockToolbar
              onClose={() => {
                setToolbarState("block");
              }}
            />
          ) : null}
        </div>
        <button
          className="hover:text-accent-contrast"
          onClick={() => {
            if (toolbarState === "linkBlock") {
              setToolbarState("block");
            } else if (toolbarState === "default") {
              useUIState.setState(() => ({
                focusedBlock: {
                  type: "card",
                  entityID: props.cardID,
                },
                selectedBlock: [],
              }));
            } else {
              setToolbarState("default");
            }
          }}
        >
          <CloseTiny />
        </button>
      </div>
    </Tooltip.Provider>
  );
};

const LinkBlockToolbar = (props: { onClose: () => void }) => {
  let entity_set = useEntitySetContext();
  let [linkValue, setLinkValue] = useState("");
  let focusedBlock = useUIState((s) => s.focusedBlock);
  let { rep } = useReplicache();
  let submit = async () => {
    if (!focusedBlock || !rep) return [];
    let entity, position;
    let parent =
      focusedBlock.type === "card"
        ? focusedBlock.entityID
        : focusedBlock.parent;
    let children = await rep.query((tx) =>
      scanIndex(tx).eav(parent, "card/block"),
    );
    if (focusedBlock.type === "card") {
      entity = v7();
      position =
        children.sort((a, b) => (a.data.position > b.data.position ? 1 : -1))[
          children.length - 1
        ]?.data.position || null;
      await rep?.mutate.addBlock({
        parent: focusedBlock.entityID,
        permission_set: entity_set.set,
        type: "text",
        position: generateKeyBetween(position, null),
        newEntityID: entity,
      });
    } else {
      entity = focusedBlock.entityID;
    }
    addLinkBlock(linkValue, entity, rep);
    props.onClose();
  };

  return (
    <div className={`flex gap-2 rounded-md text-secondary grow pr-2`}>
      <>
        <BlockLinkSmall className="shrink-0" />
        <Separator classname="h-6" />
        <Input
          autoFocus
          type="url"
          className="w-full grow border-none outline-none bg-transparent "
          placeholder="add a link..."
          value={linkValue}
          onChange={(e) => setLinkValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              submit();
            }
          }}
        />
        <button
          className="hover:text-accent-contrast -mr-6"
          onMouseDown={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <CheckTiny />
        </button>
      </>
    </div>
  );
};

const HighlightToolbar = (props: {
  onClose: () => void;
  lastUsedHighlight: "1" | "2" | "3";
  setLastUsedHighlight: (color: "1" | "2" | "3") => void;
}) => {
  return (
    <div className="flex w-full justify-between items-center gap-4 text-secondary">
      <div className="flex items-center gap-[6px]">
        <HighlightSmall />
        <Separator classname="h-6" />
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
        <HighlightColorSettings />
      </div>
    </div>
  );
};

const ListToolbar = (props: { onClose: () => void }) => {
  // This Toolbar should close once the user starts typing again
  return (
    <div className="flex w-full justify-between items-center gap-4">
      <div className="flex items-center gap-[6px]">
        <ToolbarButton
          onClick={() => props.onClose()}
          tooltipContent={<div></div>}
        >
          <ListOrderedSmall />
        </ToolbarButton>
        <Separator classname="h-6" />
        <ToolbarButton onClick={() => {}} tooltipContent={<div></div>}>
          <ListUnorderedSmall />
        </ToolbarButton>
        <ToolbarButton onClick={() => {}} tooltipContent={<div></div>}>
          <ListOrderedSmall />
        </ToolbarButton>

        {/* if there is no list and you click and indent button, then it should create a list */}
        <ToolbarButton tooltipContent={<div></div>}>
          <ListIndentIncreaseSmall />
        </ToolbarButton>
        <ToolbarButton tooltipContent={<div></div>}>
          <ListIndentDecreaseSmall />
        </ToolbarButton>
      </div>
    </div>
  );
};

const BlockToolbar = (props: {
  onClose: () => void;
  setToolbarState: (s: "linkBlock") => void;
}) => {
  let [state, setState] = useState<"normal" | "link">("normal");
  let { rep } = useReplicache();
  let entity_set = useEntitySetContext();
  let focusedBlock = useUIState((s) => s.focusedBlock);
  let getEntity = useCallback(async () => {
    if (!focusedBlock || !rep) return [];
    let entity, position;
    let parent =
      focusedBlock.type === "card"
        ? focusedBlock.entityID
        : focusedBlock.parent;
    let children = await rep.query((tx) =>
      scanIndex(tx).eav(parent, "card/block"),
    );
    if (focusedBlock.type === "card") {
      entity = v7();
      position =
        children.sort((a, b) => (a.data.position > b.data.position ? 1 : -1))[
          children.length - 1
        ]?.data.position || null;
      await rep?.mutate.addBlock({
        parent: focusedBlock.entityID,
        permission_set: entity_set.set,
        type: "text",
        position: generateKeyBetween(position, null),
        newEntityID: entity,
      });
    } else {
      entity = focusedBlock.entityID;
    }
    return [entity, parent];
  }, [focusedBlock, rep, entity_set]);
  if (state === "normal")
    return (
      <div className="flex w-full justify-between items-center gap-4">
        <div className="flex items-center gap-[6px] w-full">
          <BlockSmall />
          <Separator classname="h-6" />
          <ToolbarButton tooltipContent=<div>Add an Image</div>>
            <label
              className="blockOptionsImage hover:cursor-pointer flex place-items-center"
              onMouseDown={(e) => e.preventDefault()}
            >
              <BlockImageSmall />

              <div className="hidden">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    let file = e.currentTarget.files?.[0];
                    if (!file || !rep || !focusedBlock) return;
                    let [entity, parent] = await getEntity();
                    await rep.mutate.assertFact({
                      entity,
                      attribute: "block/type",
                      data: { type: "block-type-union", value: "image" },
                    });
                    await addImage(file, rep, {
                      entityID: entity,
                      attribute: "block/image",
                    });
                  }}
                />
              </div>
            </label>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => props.setToolbarState("linkBlock")}
            tooltipContent=<div>Add a Link</div>
          >
            <BlockLinkSmall />
          </ToolbarButton>
          <ToolbarButton
            tooltipContent=<div>Add a Page</div>
            onClick={async () => {
              if (!focusedBlock || !rep) return;
              let [entity, parent] = await getEntity();
              await rep?.mutate.assertFact({
                entity: entity,
                attribute: "block/type",
                data: { type: "block-type-union", value: "card" },
              });
              useUIState.getState().openCard(parent, entity);
              let entityID = v7();
              await rep?.mutate.addBlock({
                parent: entity,
                position: "a0",
                newEntityID: entityID,
                type: "text",
                permission_set: entity_set.set,
              });
              focusCard(entity, rep, "focusFirstBlock");
            }}
          >
            <BlockCardSmall />
          </ToolbarButton>
        </div>
      </div>
    );
  return;
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
    <Tooltip.Root>
      <Tooltip.Trigger
        disabled={props.disabled}
        className={`
          rounded-md active:bg-border active:text-primary
          ${props.className}
          ${
            props.active
              ? "bg-border text-primary"
              : props.disabled
                ? "text-border cursor-not-allowed"
                : "text-secondary  hover:bg-border hover:text-primary"
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
