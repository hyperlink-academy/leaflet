"use client";
import React, { createContext, useContext } from "react";
import type { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { ButtonPrimary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { BoldTiny } from "components/Icons/BoldTiny";
import { ItalicTiny } from "components/Icons/ItalicTiny";
import { StrikethroughTiny } from "components/Icons/StrikethroughTiny";
import {
  isMarkActive,
  toggleMarkInSelection,
} from "src/utils/prosemirror/markInSelection";

// The ProseMirror editor the formatting buttons act on
export type ComposerEditor = { state: EditorState; view: EditorView };

// What every composer looks like: the input in its box, formatting buttons
// under it, and the composer's actions opposite them. What goes in the box is
// the caller's: a TextComposer, or a LimitedLeafletEditor's blocks.
export function ComposerChrome(props: {
  // Unset (nothing to format yet) disables the formatting buttons
  editor: ComposerEditor | null;
  // No box around the input, for a composer inside a container of its own
  bare?: boolean;
  // What a ComposerSubmit among the actions does
  onSubmit?: () => void;
  submitting?: boolean;
  // Rendered above the input
  above?: React.ReactNode;
  // Opposite the formatting buttons
  actions?: React.ReactNode;
  className?: string;
  inputClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`composer flex flex-col grow ${props.className ?? ""}`}>
      {props.above}
      <div
        className={`composerInputWrapper relative group flex flex-col w-full ${
          props.bare ? "" : "input-with-border min-h-32 px-2! py-[6px]!"
        } ${props.inputClassName ?? ""}`}
      >
        {props.children}
      </div>
      <div className="composerFormatting flex justify-between pt-1">
        <div className="flex gap-1">
          <MarkButton
            editor={props.editor}
            mark="strong"
            label="Bold"
            icon={<BoldTiny />}
          />
          <MarkButton
            editor={props.editor}
            mark="em"
            label="Italic"
            icon={<ItalicTiny />}
          />
          <MarkButton
            editor={props.editor}
            mark="strikethrough"
            label="Strikethrough"
            icon={<StrikethroughTiny />}
          />
        </div>
        <div className="composerActions flex items-center gap-2">
          <ComposerSubmitContext.Provider
            value={
              props.onSubmit
                ? { submit: props.onSubmit, submitting: !!props.submitting }
                : null
            }
          >
            {props.actions}
          </ComposerSubmitContext.Provider>
        </div>
      </div>
    </div>
  );
}

function MarkButton(props: {
  editor: ComposerEditor | null;
  mark: "strong" | "em" | "strikethrough";
  label: string;
  icon: React.ReactNode;
}) {
  // Looked up per editor: a LimitedLeafletEditor's blocks and a TextComposer
  // use different schemas, each with its own mark types.
  let type = props.editor?.state.schema.marks[props.mark];
  let active =
    !!props.editor && !!type && isMarkActive(props.editor.state, type);
  return (
    <button
      type="button"
      aria-label={props.label}
      disabled={!type}
      className={`composerMarkButton rounded-md p-1 enabled:hover:bg-border-light disabled:opacity-50 ${active ? "bg-border-light text-primary" : "text-border"}`}
      // mousedown, so the editor keeps its selection
      onMouseDown={(e) => {
        e.preventDefault();
        if (props.editor && type)
          toggleMarkInSelection(props.editor.view, type);
      }}
    >
      {props.icon}
    </button>
  );
}

const ComposerSubmitContext = createContext<{
  submitting: boolean;
  submit: () => void;
} | null>(null);

// Sends the composer it's in, through the composer's onSubmit
export function ComposerSubmit(props: {
  className?: string;
  children: React.ReactNode;
}) {
  let composer = useContext(ComposerSubmitContext);
  return (
    <ButtonPrimary
      compact
      className={props.className}
      disabled={!composer || composer.submitting}
      onClick={() => composer?.submit()}
    >
      {composer?.submitting ? <DotLoader /> : props.children}
    </ButtonPrimary>
  );
}

// Same footprint as the composer (input + toolbar row) so what's below
// doesn't jump while the viewer's identity or the editor chunk is loading.
export function ComposerPlaceholder(props: { className?: string }) {
  return (
    <div className="flex flex-col grow">
      <div
        className={`border input-with-border min-h-32 px-2 py-[6px] ${props.className ?? ""}`}
      />
      <div className="pt-1 h-[30px]" />
    </div>
  );
}
