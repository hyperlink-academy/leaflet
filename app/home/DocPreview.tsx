"use client";
import { BlockPreview, CardPreview } from "components/Blocks/CardBlock";
import {
  ThemeBackgroundProvider,
  ThemeProvider,
} from "components/ThemeManager/ThemeProvider";
import { useRef, useState } from "react";
import { Link } from "react-aria-components";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { PermissionToken } from "src/replicache";
import { DocOptions } from "./DocOptions";
import { deleteDoc } from "actions/deleteDoc";

export const DocPreview = (props: {
  token: PermissionToken;
  doc_id: string;
}) => {
  let [state, setState] = useState<"normal" | "deleting">("normal");
  return (
    <div className="relative h-40">
      <ThemeProvider local entityID={props.doc_id}>
        {state === "normal" ? (
          <Link
            href={"/" + props.token.id}
            className={`no-underline text-primary h-full`}
          >
            <div className="rounded-lg overflow-clip border border-border bg-bg-page grow w-full h-full">
              <ThemeBackgroundProvider entityID={props.doc_id}>
                <div className="docPreview grow shrink-0 h-full w-full px-2 pt-2 sm:px-3 sm:pt-3 flex items-end">
                  <div
                    className="docContentWrapper w-full h-full max-w-48 mx-auto border border-border-light border-b-0 rounded-t-md px-1 pt-1 sm:px-[6px] sm:pt-2 overflow-clip"
                    style={{
                      backgroundColor:
                        "rgba(var(--bg-card), var(--bg-card-alpha))",
                    }}
                  >
                    <DocContent entityID={props.doc_id} />
                  </div>
                </div>
              </ThemeBackgroundProvider>
            </div>
          </Link>
        ) : (
          <div className="docPreview grow shrink-0 w-full flex items-end">
            <div
              className="docContentWrapper w-full h-full border border-border-light border-b-0 rounded-lg px-1 pt-1 sm:px-[6px] sm:pt-2 overflow-clip flex flex-col gap-2 place-items-center justify-center items-center "
              style={{
                backgroundColor: "rgba(var(--bg-card), var(--bg-card-alpha))",
              }}
            >
              <div className="font-bold text-lg text-center">
                Permanently delete this doc?
              </div>
              <div className="flex gap-2">
                <button
                  className="bg-accent-1 text-accent-2 px-2 py-1 rounded-md "
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    deleteDoc(props.token);
                  }}
                >
                  Delete
                </button>
                <button
                  className="text-accent-1"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setState("normal");
                  }}
                >
                  Nevermind
                </button>
              </div>
            </div>
          </div>
        )}
        {state === "normal" && (
          <DocOptions doc_id={props.doc_id} setState={setState} />
        )}
      </ThemeProvider>
    </div>
  );
};

const DocContent = (props: { entityID: string }) => {
  let blocks = useBlocks(props.entityID);
  let previewRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={previewRef}
      className={`cardBlockPreview w-full h-full overflow-clip flex flex-col gap-0.5 no-underline `}
    >
      {blocks.slice(0, 10).map((b) => {
        return (
          <BlockPreview
            previewRef={previewRef}
            {...b}
            key={b.factID}
            size="large"
          />
        );
      })}
    </div>
  );
};
