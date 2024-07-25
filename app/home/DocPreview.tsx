"use client";
import { BlockPreview, CardPreview } from "components/Blocks/CardBlock";
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
      className="doc flex flex-row sm:flex-col gap-3 sm:gap-1 grow basis-64 no-underline text-primary "
    >
      <div className="docLink flex flex-row sm:flex-col gap-3 sm:gap-1 grow">
        <div className="docImage bg-bg-page shrink-0 w-24 h-24 sm:w-full sm:h-40 px-2 pt-2  sm:px-3 sm:pt-2 border border-border rounded-lg flex items-end">
          <div className="docContent bg-bg-card w-full h-full sm:max-w-48 sm:max-h-36 mx-auto border border-border-light border-b-0 rounded-t-md px-1 pt-1 sm:px-[6px] sm:pt-2 overflow-clip">
            <DocImage entityID={props.doc_id} />
          </div>
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
