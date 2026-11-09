"use client";
import React from "react";
import { ButtonTertiary } from "components/Buttons";
import { ShareTiny } from "components/Icons/ShareTiny";
import { ComposerChrome, ComposerSubmit, type ComposerEditor } from ".";

export function LimitedLeafletComposer(props: {
  editor: ComposerEditor | null;
  publishing?: boolean;
  onPublish: () => void;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <ComposerChrome
      bare
      editor={props.editor}
      onSubmit={props.onPublish}
      submitting={props.publishing}
      actions={
        <>
          <ButtonTertiary compact className="text-sm" onClick={props.onClear}>
            Clear
          </ButtonTertiary>
          <ComposerSubmit className="text-sm">
            Publish <ShareTiny />
          </ComposerSubmit>
        </>
      }
    >
      {props.children}
    </ComposerChrome>
  );
}
