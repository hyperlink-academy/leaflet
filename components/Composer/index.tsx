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

export type ComposerEditor = { state: EditorState; view: EditorView };

export function ComposerChrome(props: {
  editor: ComposerEditor | null;
  bare?: boolean;
  onSubmit?: () => void;
  submitting?: boolean;
  // Rendered above the input
  above?: React.ReactNode;
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
  let type = props.editor?.state.schema.marks[props.mark];
  let active =
    !!props.editor && !!type && isMarkActive(props.editor.state, type);
  return (
    <button
      type="button"
      aria-label={props.label}
      disabled={!type}
      className={`composerMarkButton rounded-md p-1 enabled:hover:bg-border-light disabled:opacity-50 ${active ? "bg-border-light text-primary" : "text-border"}`}
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
