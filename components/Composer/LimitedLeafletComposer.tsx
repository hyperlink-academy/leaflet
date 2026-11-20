"use client";
import React from "react";
import { ButtonTertiary } from "components/Buttons";
import { ShareTiny } from "components/Icons/ShareTiny";
import { ComposerChrome, ComposerSubmit, type ComposerEditor } from ".";

export function LimitedLeafletComposer(props: {
  editor: ComposerEditor | null;
  publishing?: boolean;
  onPublish: () => void;
  publishLabel: string;
  discardLabel: string;
  onDiscard: () => void;
  imagesInto?: string;
  children: React.ReactNode;
}) {
  return (
    <ComposerChrome
      bare
      editor={props.editor}
      allowImages={props.imagesInto}
      onSubmit={props.onPublish}
      submitting={props.publishing}
      actions={
        <>
          <ButtonTertiary
            compact
            className="text-sm"
            disabled={props.publishing}
            onClick={props.onDiscard}
          >
            {props.discardLabel}
          </ButtonTertiary>
          <ComposerSubmit className="text-sm">
            {props.publishLabel} <ShareTiny />
          </ComposerSubmit>
        </>
      }
    >
      {props.children}
    </ComposerChrome>
  );
}
