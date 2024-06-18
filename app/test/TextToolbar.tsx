"use client";

import { useState } from "react";
import {
  BoldSmall,
  CloseTiny,
  ItalicSmall,
  RedoSmall,
  UndoSmall,
  UnderlineSmall,
  LinkTextToolbarSmall,
  ParagraphSmall,
  ListUnorderedSmall,
  Header1Small,
  Header2Small,
  Header3Small,
  ListOrderedSmall,
  ListIndentDecreaseSmall,
  ListIndentIncreaseSmall,
  BlockImageSmall,
  BlockLinkSmall,
  BlockCardSmall,
  BlockSmall,
} from "components/Icons";
import { create } from "zustand";
import { combine } from "zustand/middleware";

type textState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
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
      header: "p",
      list: "none",
      link: undefined as string | undefined,
    },
    (set) => ({
      toggleBold: () => set((state) => ({ bold: !state.bold })),
      toggleItalic: () => set((state) => ({ italic: !state.italic })),
      toggleUnderline: () => set((state) => ({ underline: !state.underline })),
      setHeader: (newHeader: "h1" | "h2" | "h3" | "p") =>
        set(() => ({ header: newHeader })),
      setList: (newList: "ordered" | "unordered" | "none") =>
        set(() => ({ list: newList })),
      setLink: (newLink: string) => set(() => ({ link: newLink })),
    }),
  ),
);

export const TextToolbar = () => {
  let [toolbarState, setToolbarState] = useState<
    "default" | "link" | "header" | "list" | "block"
  >("default");

  let state = useTextState();

  return (
    <>
      {toolbarState === "default" ? (
        <>
          <ToolbarButton onClick={() => {}}>
            <UndoSmall />
          </ToolbarButton>
          <ToolbarButton onClick={() => {}}>
            <RedoSmall />
          </ToolbarButton>
          <Separator />
          <ToolbarButton
            active={state.bold}
            onClick={() => {
              state.toggleBold();
            }}
          >
            <BoldSmall />
          </ToolbarButton>
          <ToolbarButton
            active={state.italic}
            onClick={() => {
              state.toggleItalic();
            }}
          >
            <ItalicSmall />
          </ToolbarButton>
          <ToolbarButton
            active={state.underline}
            onClick={() => {
              state.toggleUnderline();
            }}
          >
            <UnderlineSmall />
          </ToolbarButton>
          {/* possibly link is only available if text is actively selected  */}
          <ToolbarButton
            active={state.link !== undefined && state.link !== ""}
            onClick={() => {
              setToolbarState("link");
            }}
          >
            <LinkTextToolbarSmall />
          </ToolbarButton>
          <Separator />
          <ToolbarButton
            active
            onClick={() => {
              setToolbarState("header");
            }}
          >
            {state.header === "h1" ? (
              <Header1Small />
            ) : state.header === "h2" ? (
              <Header2Small />
            ) : state.header === "h3" ? (
              <Header3Small />
            ) : (
              <ParagraphSmall />
            )}
          </ToolbarButton>
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
          <Separator />
          <ToolbarButton
            onClick={() => {
              setToolbarState("block");
            }}
          >
            <BlockSmall />
          </ToolbarButton>
        </>
      ) : toolbarState === "link" ? (
        <>
          <ToolbarButton
            active={state.link !== undefined && state.link !== ""}
            onClick={() => setToolbarState("default")}
          >
            <LinkTextToolbarSmall />
          </ToolbarButton>
          <Separator />
          <input
            className="w-full grow bg-transparent border-none outline-none "
            placeholder="www.leafl.et"
            value={state.link}
            onChange={(e) => state.setLink(e.target.value)}
          />
          <button onClick={() => setToolbarState("default")}>
            <CloseTiny />
          </button>
        </>
      ) : toolbarState === "header" ? (
        <HeaderToolbar onClose={() => setToolbarState("default")} />
      ) : toolbarState === "list" ? (
        <ListToolbar onClose={() => setToolbarState("default")} />
      ) : toolbarState === "block" ? (
        <BlockToolbar onClose={() => setToolbarState("default")} />
      ) : null}
    </>
  );
};

const HeaderToolbar = (props: { onClose: () => void }) => {
  let state = useTextState();

  return (
    <div className="flex w-full justify-between items-center gap-4">
      <div className="flex items-center gap-[6px]">
        <ToolbarButton
          className="w-10 flex justify-center"
          active
          onClick={() => props.onClose()}
        >
          {state.header === "h1" ? (
            <Header1Small />
          ) : state.header === "h2" ? (
            <Header2Small />
          ) : state.header === "h3" ? (
            <Header3Small />
          ) : (
            <ParagraphSmall />
          )}{" "}
        </ToolbarButton>
        <Separator />
        <ToolbarButton
          onClick={() => state.setHeader("h1")}
          active={state.header === "h1"}
        >
          <Header1Small />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => state.setHeader("h2")}
          active={state.header === "h2"}
        >
          <Header2Small />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => state.setHeader("h3")}
          active={state.header === "h3"}
        >
          <Header3Small />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => state.setHeader("p")}
          active={state.header === "p"}
          className="px-[6px]"
        >
          Paragraph
        </ToolbarButton>
      </div>
      <button onClick={() => props.onClose()}>
        <CloseTiny />
      </button>
    </div>
  );
};

const ListToolbar = (props: { onClose: () => void }) => {
  let state = useTextState();

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
          onClick={() => state.setList("unordered")}
          active={state.list === "unordered"}
        >
          <ListUnorderedSmall />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => state.setList("ordered")}
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
      <button onClick={() => props.onClose()}>
        <CloseTiny />
      </button>
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
      <button onClick={() => props.onClose()}>
        <CloseTiny />
      </button>
    </div>
  );
};

const ToolbarButton = (props: {
  textState?: textState;
  setTextState?: (textState: textState) => void;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
  active?: boolean;
}) => {
  return (
    <button
      className={`rounded-md shrink-0  p-0.5 active:bg-accent active:text-accentText ${props.className} ${props.active ? "bg-accent text-accentText" : ""}`}
      onClick={() => {
        props.onClick && props.onClick();
      }}
    >
      {props.children}
    </button>
  );
};

const Separator = () => {
  return <div className="h-6 border-r border-border" />;
};
