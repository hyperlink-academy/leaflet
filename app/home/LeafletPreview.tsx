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
import { deleteLeaflet } from "actions/deleteLeaflet";
import { removeDocFromHome } from "./storage";
import { mutate } from "swr";
import useMeasure from "react-use-measure";
import { ButtonPrimary } from "components/Buttons";
import { LeafletOptions } from "./LeafletOptions";

export const LeafletPreview = (props: {
  token: PermissionToken;
  leaflet_id: string;
}) => {
  let [state, setState] = useState<"normal" | "deleting">("normal");
  return (
    <div className="relative h-40">
      <ThemeProvider local entityID={props.leaflet_id}>
        <div className="rounded-lg hover:shadow-sm overflow-clip border border-border outline outline-transparent hover:outline-border bg-bg-page grow w-full h-full">
          {state === "normal" ? (
            <Link
              href={"/" + props.token.id}
              className={`no-underline hover:no-underline text-primary h-full`}
            >
              <ThemeBackgroundProvider entityID={props.leaflet_id}>
                <div className="leafletPreview grow shrink-0 h-full w-full px-2 pt-2 sm:px-3 sm:pt-3 flex items-end pointer-events-none">
                  <div
                    className="leafletContentWrapper w-full h-full max-w-48 mx-auto border border-border-light border-b-0 rounded-t-md overflow-clip"
                    style={{
                      backgroundColor:
                        "rgba(var(--bg-card), var(--bg-card-alpha))",
                    }}
                  >
                    <LeafletContent entityID={props.leaflet_id} />
                  </div>
                </div>
              </ThemeBackgroundProvider>
            </Link>
          ) : (
            <LeafletAreYouSure token={props.token} setState={setState} />
          )}
        </div>
        <div className="flex justify-end pt-1">
          <LeafletOptions leaflet={props.token} setState={setState} />
        </div>
      </ThemeProvider>
    </div>
  );
};

const LeafletContent = (props: { entityID: string }) => {
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

const LeafletAreYouSure = (props: {
  token: PermissionToken;
  setState: (s: "normal" | "deleting") => void;
}) => {
  return (
    <div
      className="leafletContentWrapper w-full h-full px-1 pt-1 sm:px-[6px] sm:pt-2 flex flex-col gap-2 justify-center items-center "
      style={{
        backgroundColor: "rgba(var(--bg-card), var(--bg-card-alpha))",
      }}
    >
      <div className="font-bold text-center">
        Permanently delete this Leaflet?
      </div>
      <div className="flex gap-2 font-bold ">
        <ButtonPrimary
          compact
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            deleteLeaflet(props.token);
            removeDocFromHome(props.token);
            mutate("leaflets");
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
