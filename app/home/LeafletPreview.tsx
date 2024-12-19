"use client";
import { BlockPreview, PagePreview } from "components/Blocks/PageLinkBlock";
import {
  ThemeBackgroundProvider,
  ThemeProvider,
} from "components/ThemeManager/ThemeProvider";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-aria-components";
import { useBlocks } from "src/hooks/queries/useBlocks";
import {
  PermissionToken,
  useEntity,
  useReferenceToEntity,
  useReplicache,
} from "src/replicache";
import { deleteLeaflet } from "actions/deleteLeaflet";
import { removeDocFromHome } from "./storage";
import { mutate } from "swr";
import { ButtonPrimary } from "components/Buttons";
import { LeafletOptions } from "./LeafletOptions";
import { CanvasContent } from "components/Canvas";
import { useSubscribe } from "replicache-react";
import { TemplateSmall } from "components/Icons";
import { theme } from "tailwind.config";
import { useTemplateState } from "./CreateNewButton";
import styles from "./LeafletPreview.module.css";

export const LeafletPreview = (props: {
  index: number;
  token: PermissionToken;
  leaflet_id: string;
  loggedIn: boolean;
}) => {
  let [state, setState] = useState<"normal" | "deleting">("normal");
  let isTemplate = useTemplateState(
    (s) => !!s.templates.find((t) => t.id === props.token.id),
  );
  let root =
    useReferenceToEntity("root/page", props.leaflet_id)[0]?.entity ||
    props.leaflet_id;
  let firstPage = useEntity(root, "root/page")[0];
  let page = firstPage?.data.value || root;

  return (
    <div className="relative max-h-40 h-40">
      <ThemeProvider local entityID={root}>
        <div className="rounded-lg hover:shadow-sm overflow-clip border border-border outline outline-2 outline-transparent outline-offset-1 hover:outline-border bg-bg-leaflet grow w-full h-full">
          {state === "normal" ? (
            <div className="relative w-full h-full">
              <ThemeBackgroundProvider entityID={root}>
                <div className="leafletPreview grow shrink-0 h-full w-full px-2 pt-2 sm:px-3 sm:pt-3 flex items-end pointer-events-none">
                  <div
                    className="leafletContentWrapper h-full  sm:w-48 w-40 mx-auto border border-border-light border-b-0 rounded-t-md overflow-clip"
                    style={{
                      backgroundColor:
                        "rgba(var(--bg-page), var(--bg-page-alpha))",
                    }}
                  >
                    <LeafletContent entityID={page} index={props.index} />
                  </div>
                </div>
              </ThemeBackgroundProvider>
              <Link
                href={"/" + props.token.id}
                className={`no-underline hover:no-underline text-primary absolute inset-0 w-full h-full`}
              ></Link>
            </div>
          ) : (
            <LeafletAreYouSure token={props.token} setState={setState} />
          )}
        </div>
        <div className="flex justify-end pt-1 shrink-0">
          <LeafletOptions
            leaflet={props.token}
            isTemplate={isTemplate}
            loggedIn={props.loggedIn}
          />
        </div>
        <LeafletTemplateIndicator isTemplate={isTemplate} />
      </ThemeProvider>
    </div>
  );
};

const LeafletContent = (props: { entityID: string; index: number }) => {
  let type = useEntity(props.entityID, "page/type")?.data.value || "doc";
  let blocks = useBlocks(props.entityID);
  let previewRef = useRef<HTMLDivElement | null>(null);
  let [isVisible, setIsVisible] = useState(props.index > 16 ? false : true);
  useEffect(() => {
    if (!previewRef.current) return;
    let observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          } else {
            setIsVisible(false);
          }
        });
      },
      { threshold: 0.1, root: null },
    );
    observer.observe(previewRef.current);
    return () => observer.disconnect();
  }, [previewRef]);

  if (type === "canvas")
    return (
      <div
        className={`pageLinkBlockPreview shrink-0 h-full overflow-clip relative bg-bg-page shadow-sm  rounded-md`}
      >
        <div
          className={`absolute top-0 left-0 origin-top-left pointer-events-none ${styles.scaleLeafletCanvasPreview}`}
          style={{
            width: `1272px`,
            height: "calc(1272px * 2)",
          }}
        >
          {isVisible && <CanvasContent entityID={props.entityID} preview />}
        </div>
      </div>
    );

  return (
    <div
      ref={previewRef}
      className={`pageLinkBlockPreview h-full overflow-clip flex flex-col gap-0.5 no-underline relative`}
    >
      <div
        className={`absolute top-0 left-0 w-full h-full origin-top-left pointer-events-none ${styles.scaleLeafletDocPreview}`}
        style={{
          width: `var(--page-width-units)`,
        }}
      >
        {isVisible &&
          blocks.slice(0, 10).map((b, index, arr) => {
            return (
              <BlockPreview
                pageType="doc"
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
        backgroundColor: "rgba(var(--bg-page), var(--bg-page-alpha))",
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

const LeafletTemplateIndicator = (props: { isTemplate: boolean }) => {
  if (!props.isTemplate) return;

  return (
    <div className="absolute -top-3 right-1">
      <TemplateSmall fill={theme.colors["bg-page"]} />
    </div>
  );
};
