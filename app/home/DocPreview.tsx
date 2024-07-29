"use client";
import { BlockPreview, CardPreview } from "components/Blocks/CardBlock";
import { ThemeProvider } from "components/ThemeManager/ThemeProvider";
import { useRef } from "react";
import { Link } from "react-aria-components";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { PermissionToken } from "src/replicache";

export const DocPreview = (props: {
  token: PermissionToken;
  doc_id: string;
}) => {
  return (
    <Link
      href={"/" + props.token.id}
      className="doc flex flex-row sm:flex-col gap-3 sm:gap-1 grow no-underline text-primary s "
    >
      <div className="docLink flex flex-row sm:flex-col gap-3 sm:gap-1 grow rounded-lg">
        <div className="rounded-lg overflow-clip border border-border">
          <ThemeProvider local entityID={props.doc_id}>
            <div className="docImage shrink-0 w-24 h-24 sm:w-full sm:h-40 px-2 pt-2 sm:px-3 sm:pt-3 flex items-end">
              <div
                className="docContent w-full h-full sm:max-w-48 mx-auto border border-border-light border-b-0 rounded-t-md px-1 pt-1 sm:px-[6px] sm:pt-2 overflow-clip"
                style={{
                  backgroundColor: "rgba(var(--bg-card), var(--bg-card-alpha))",
                }}
              >
                <DocImage entityID={props.doc_id} />
              </div>
            </div>
          </ThemeProvider>
        </div>
        <div className="docDescription flex flex-col grow gap-0">
          <h4 className="line-clamp-3 sm:line-clamp-1">
            Title is really long and goes several several several lines and
            wraped them a lot and all kinds of shit and somehow still needs more
            and stuff so here we go
          </h4>
        </div>
      </div>
    </Link>
  );
};

const DocImage = (props: { entityID: string }) => {
  let blocks = useBlocks(props.entityID);
  let previewRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={previewRef}
      className={`cardBlockPreview w-full h-full overflow-clip flex flex-col gap-0.5 `}
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
