"use client";
import { BlockPreview, CardPreview } from "components/Blocks/CardBlock";
import {
  ThemeBackgroundProvider,
  ThemeProvider,
} from "components/ThemeManager/ThemeProvider";
import { useRef } from "react";
import { Link } from "react-aria-components";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { PermissionToken } from "src/replicache";
import { DocOptions } from "./DocOptions";

export const DocPreview = (props: {
  token: PermissionToken;
  doc_id: string;
}) => {
  return (
    <ThemeProvider local entityID={props.doc_id}>
      <div className="relative">
        <Link
          href={"/" + props.token.id}
          className={`no-underline text-primary `}
        >
          <div className="rounded-lg overflow-clip border border-border bg-bg-page grow w-full">
            <ThemeBackgroundProvider entityID={props.doc_id}>
              <div className="docPreview grow shrink-0 w-full h-40 px-2 pt-2 sm:px-3 sm:pt-3 flex items-end">
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
        <DocOptions doc_id={props.doc_id} />
      </div>
    </ThemeProvider>
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
