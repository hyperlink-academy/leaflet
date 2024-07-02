"use client";

import { useState } from "react";
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
} from "components/Icons";
import { create } from "zustand";
import { combine } from "zustand/middleware";
import { schema } from "components/TextBlock/schema";
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

type textState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  header: "h1" | "h2" | "h3" | "p";
  list: "ordered" | "unordered" | "none";
  link: string | undefined;
};

let useTextState = create(
  combine(
    {
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      header: "p",
      list: "none",
      link: undefined as string | undefined,
    },
    (set) => ({
      toggleBold: () => set((state) => ({ bold: !state.bold })),
      toggleItalic: () => set((state) => ({ italic: !state.italic })),
      toggleUnderline: () => set((state) => ({ underline: !state.underline })),
      toggleStrikethrough: () =>
        set((state) => ({ strikethrough: !state.strikethrough })),
      setHeader: (newHeader: "h1" | "h2" | "h3" | "p") =>
        set(() => ({ header: newHeader })),
      setList: (newList: "ordered" | "unordered" | "none") =>
        set(() => ({ list: newList })),
      setLink: (newLink: string | undefined) => set(() => ({ link: newLink })),
    }),
  ),
);

export const TextToolbar = () => {
  let [toolbarState, setToolbarState] = useState<
    "default" | "highlight" | "link" | "header" | "list" | "block"
  >("default");

  let [lastUsedHighlight, setlastUsedHighlight] = useState<"1" | "2" | "3">(
    "1",
  );

  let state = useTextState();

  return (
    <div className="flex items-center justify-between w-full gap-6">
      <div className="flex gap-[6px] items-center">
        {toolbarState === "default" ? (
          <>
            <ToolbarButton onClick={() => {}}>
              <UndoSmall />
            </ToolbarButton>
            <Separator />
            <TextDecorationButton
              mark={schema.marks.strong}
              icon={<BoldSmall />}
            />
            <TextDecorationButton
              mark={schema.marks.em}
              icon={<ItalicSmall />}
            />
            <TextDecorationButton
              mark={schema.marks.strikethrough}
              icon={<StrikethroughSmall />}
            />
            <div className="flex items-center gap-1">
              <TextDecorationButton
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
                  className={`w-[6px] h-[20px] rounded-[2px] border border-white shadow-[0_0_0_1px_#8C8C8C]`}
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

            <Separator />
            {/* possibly link is only available if text is actively selected  */}
            <LinkButton setToolBarState={setToolbarState} />
            <Separator />
            <TextBlockTypeButton setToolbarState={setToolbarState} />
            <Separator />
            <ToolbarButton
              active={state.list !== "none"}
              onClick={() => {
                setToolbarState("list");
              }}
            >
              {state.list === "ordered" ? (
                <ListOrderedSmall />
              ) : (
                <ListUnorderedSmall />
              )}
            </ToolbarButton>
          </>
        ) : toolbarState === "highlight" ? (
          <HighlightToolbar
            onClose={() => setToolbarState("default")}
            setLastUsedHighlight={(color: "1" | "2" | "3") =>
              setlastUsedHighlight(color)
            }
          />
        ) : toolbarState === "link" ? (
          <LinkEditor onClose={() => setToolbarState("default")} />
        ) : toolbarState === "header" ? (
          <TextBlockTypeButtons onClose={() => setToolbarState("default")} />
        ) : toolbarState === "list" ? (
          <ListToolbar onClose={() => setToolbarState("default")} />
        ) : toolbarState === "block" ? (
          <BlockToolbar onClose={() => setToolbarState("default")} />
        ) : null}
      </div>
      <button
        onClick={() => {
          setToolbarState("default");
        }}
      >
        <CloseTiny />
      </button>
    </div>
  );
};

const HighlightToolbar = (props: {
  onClose: () => void;
  setLastUsedHighlight: (color: "1" | "2" | "3") => void;
}) => {
  return (
    <div className="flex w-full justify-between items-center gap-4">
      <div className="flex items-center gap-[6px]">
        <ToolbarButton onClick={() => props.onClose()}>
          <HighlightSmall />
        </ToolbarButton>
        <Separator />
        <HighlightColorButton
          color="1"
          setLastUsedHightlight={props.setLastUsedHighlight}
        />
        <HighlightColorButton
          color="2"
          setLastUsedHightlight={props.setLastUsedHighlight}
        />
        <HighlightColorButton
          color="3"
          setLastUsedHightlight={props.setLastUsedHighlight}
        />
        <HighlightColorSettings />
      </div>
    </div>
  );
};

const ListToolbar = (props: { onClose: () => void }) => {
  let state = useTextState();

  // This Toolbar should close once the user starts typing again
  return (
    <div className="flex w-full justify-between items-center gap-4">
      <div className="flex items-center gap-[6px]">
        <ToolbarButton
          onClick={() => props.onClose()}
          active={state.list !== "none"}
        >
          {state.list === "ordered" ? (
            <ListOrderedSmall />
          ) : (
            <ListUnorderedSmall />
          )}
        </ToolbarButton>
        <Separator />
        <ToolbarButton
          onClick={() => {
            state.list === "unordered"
              ? state.setList("none")
              : state.setList("unordered");
          }}
          active={state.list === "unordered"}
        >
          <ListUnorderedSmall />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            state.list === "ordered"
              ? state.setList("none")
              : state.setList("ordered");
          }}
          active={state.list === "ordered"}
        >
          <ListOrderedSmall />
        </ToolbarButton>

        {/* if there is no list and you click and indent button, then it should create a list */}
        <ToolbarButton>
          <ListIndentIncreaseSmall />
        </ToolbarButton>
        <ToolbarButton>
          <ListIndentDecreaseSmall />
        </ToolbarButton>
      </div>
    </div>
  );
};

const BlockToolbar = (props: { onClose: () => void }) => {
  return (
    <div className="flex w-full justify-between items-center gap-4">
      <div className="flex items-center gap-[6px]">
        <ToolbarButton onClick={() => props.onClose()}>
          <BlockSmall />
        </ToolbarButton>
        <Separator />
        <ToolbarButton>
          <BlockImageSmall />
        </ToolbarButton>
        <ToolbarButton>
          <BlockLinkSmall />
        </ToolbarButton>
        <ToolbarButton>
          <BlockCardSmall />
        </ToolbarButton>
      </div>
    </div>
  );
};

export const ToolbarButton = (props: {
  textState?: textState;
  setTextState?: (textState: textState) => void;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) => {
  return (
    <button
      disabled={props.disabled}
      className={`
        rounded-md  shrink-0  p-0.5 active:bg-border active:text-primary
        ${props.className}
        ${
          props.active
            ? "bg-border text-primary"
            : props.disabled
              ? "text-border cursor-not-allowed"
              : "text-secondary"
        }
        `}
      onMouseDown={(e) => {
        e.preventDefault();
        props.onClick && props.onClick(e);
      }}
    >
      {props.children}
    </button>
  );
};

const Separator = () => {
  return <div className="h-6 border-r border-border" />;
};
