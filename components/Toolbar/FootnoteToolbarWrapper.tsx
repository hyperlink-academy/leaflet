"use client";

import React, { useEffect, useState } from "react";
import { InlineLinkToolbar } from "./InlineLinkToolbar";
import { useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";
import * as Tooltip from "@radix-ui/react-tooltip";
import { addShortcut } from "src/shortcuts";
import { FootnoteTextToolbar } from "./FootnoteTextToolbar";
import { useIsMobile } from "src/hooks/isMobile";
import { CloseTiny } from "components/Icons/CloseTiny";

type FootnoteToolbarState = "default" | "link";

export const FootnoteToolbar = (props: { pageID: string }) => {
  let [toolbarState, setToolbarState] = useState<FootnoteToolbarState>("default");
  let focusedEntity = useUIState((s) => s.focusedEntity);
  let activeEditor = useEditorStates((s) =>
    focusedEntity ? s.editorStates[focusedEntity.entityID] : null,
  );

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

  let isMobile = useIsMobile();
  return (
    <Tooltip.Provider>
      <div
        className={`toolbar flex gap-2 items-center justify-between w-full
        ${isMobile ? "h-[calc(15px+var(--safe-padding-bottom))]" : "h-[26px]"}`}
      >
        <div className="toolbarOptions flex gap-1 sm:gap-[6px] items-center grow">
          {toolbarState === "default" ? (
            <FootnoteTextToolbar setToolbarState={setToolbarState} />
          ) : toolbarState === "link" ? (
            <InlineLinkToolbar
              onClose={() => {
                activeEditor?.view?.focus();
                setToolbarState("default");
              }}
            />
          ) : null}
        </div>
        <button
          className="toolbarBackToDefault hover:text-accent-contrast"
          onMouseDown={(e) => {
            e.preventDefault();
            if (toolbarState === "default") {
              useUIState.setState(() => ({
                focusedEntity: {
                  entityType: "page",
                  entityID: props.pageID,
                },
                selectedBlocks: [],
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
