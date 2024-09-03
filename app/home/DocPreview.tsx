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
import { removeDocFromHome } from "./storage";
import { mutate } from "swr";
import useMeasure from "react-use-measure";
import { ButtonPrimary } from "components/Buttons";

export const DocPreview = (props: {
  token: PermissionToken;
  doc_id: string;
}) => {
  let [state, setState] = useState<"normal" | "deleting">("normal");
  return (
    <div className="relative h-40">
      <ThemeProvider local entityID={props.doc_id}>
        <div className="rounded-lg hover:shadow-sm overflow-clip border border-border outline outline-transparent hover:outline-border bg-bg-page grow w-full h-full">
          {state === "normal" ? (
            <Link
              href={"/" + props.token.id}
              className={`no-underline hover:no-underline text-primary h-full`}
            >
              <ThemeBackgroundProvider entityID={props.doc_id}>
                <div className="docPreview grow shrink-0 h-full w-full px-2 pt-2 sm:px-3 sm:pt-3 flex items-end pointer-events-none">
                  <div
                    className="docContentWrapper w-full h-full max-w-48 mx-auto border border-border-light border-b-0 rounded-t-md overflow-clip"
                    style={{
                      backgroundColor:
                        "rgba(var(--bg-card), var(--bg-card-alpha))",
                    }}
                  >
                    <DocContent entityID={props.doc_id} />
                  </div>
                </div>
              </ThemeBackgroundProvider>
            </Link>
          ) : (
            <DocAreYouSure token={props.token} setState={setState} />
          )}
        </div>
        <div className="flex justify-end pt-1">
          <DocOptions doc={props.token} setState={setState} />
        </div>
      </ThemeProvider>
    </div>
  );
};

const DocContent = (props: { entityID: string }) => {
  let blocks = useBlocks(props.entityID);
  let previewRef = useRef<HTMLDivElement | null>(null);
  let [ref, dimensions] = useMeasure();

  return (
    <div
      ref={previewRef}
      className={`cardBlockPreview w-full h-full overflow-clip flex flex-col gap-0.5 no-underline relative`}
    >
      <div className="w-full" ref={ref} />
      <div
        className="absolute top-0 left-0 w-full h-full origin-top-left pointer-events-none"
        style={{
          width: `calc(var(--card-width) * 1px)`,
          transform: `scale(calc(${dimensions.width} / var(--card-width)))`,
        }}
      >
        {blocks.slice(0, 10).map((b, index, arr) => {
          return (
            <BlockPreview
              entityID={b.value}
              previousBlock={arr[index - 1] || null}
              nextBlock={arr[index + 1] || null}
              nextPosition={""}
              previewRef={previewRef}
              {...b}
              key={b.factID}
            />
          );
        })}
      </div>
    </div>
  );
};

const DocAreYouSure = (props: {
  token: PermissionToken;
  setState: (s: "normal" | "deleting") => void;
}) => {
  return (
    <div
      className="docContentWrapper w-full h-full px-1 pt-1 sm:px-[6px] sm:pt-2 flex flex-col gap-2 justify-center items-center "
      style={{
        backgroundColor: "rgba(var(--bg-card), var(--bg-card-alpha))",
      }}
    >
      <div className="font-bold text-center">Permanently delete this doc?</div>
      <div className="flex gap-2 font-bold ">
        <ButtonPrimary
          compact
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            deleteDoc(props.token);
            removeDocFromHome(props.token);
            mutate("docs");
          }}
        >
          Delete
        </ButtonPrimary>
        <button
          className="text-accent-1"
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            props.setState("normal");
          }}
        >
          Nevermind
        </button>
      </div>
    </div>
  );
};
