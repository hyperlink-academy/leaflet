import { BlockProps } from "components/Blocks";
import { focusCard } from "components/Cards";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { RenderedTextBlock } from "./TextBlock";
import { useDocMetadata } from "src/hooks/queries/useDocMetadata";

export function CardBlock(props: BlockProps) {
  let isSelected = useUIState(
    (s) =>
      (props.type !== "text" || s.selectedBlock.length > 1) &&
      s.selectedBlock.find((b) => b.value === props.entityID),
  );
  let docMetadata = useDocMetadata(props.entityID);

  let isOpen = useUIState((s) => s.openCards).includes(props.entityID);

  let { rep } = useReplicache();

  return (
    <div
      className={`
        cardBlockWrapper relative group
        w-full h-[104px]
        bg-bg-card border shadow-sm outline outline-1 hover:outline-border-light rounded-lg
        flex overflow-hidden
        cursor-pointer
        ${isSelected || isOpen ? "outline-border border-border" : "outline-transparent border-border-light"}
        `}
      onClick={(e) => {
        e.stopPropagation();
        useUIState.getState().openCard(props.parent, props.entityID);
        if (rep) focusCard(props.entityID, rep, "focusFirstBlock");
      }}
    >
      <div className="pt-2 pb-2 px-2 grow min-w-0">
        {docMetadata.heading && (
          <div
            className={`cardBlockTitle bg-transparent -mb-0.5  border-none text-base font-bold outline-none resize-none align-top border h-[24px] line-clamp-1`}
          >
            <RenderedTextBlock entityID={docMetadata.heading} />
          </div>
        )}
        {docMetadata.content && (
          <div
            className={`cardBlockDescription text-sm bg-transparent border-none outline-none resize-none align-top  ${docMetadata.heading ? "line-clamp-3" : "line-clamp-4"}`}
          >
            <RenderedTextBlock entityID={docMetadata.content} />
          </div>
        )}
      </div>
      <CardPreview entityID={props.entityID} />
    </div>
  );
}

function CardPreview(props: { entityID: string }) {
  let blocks = useEntity(props.entityID, "card/block");
  return (
    <div
      className={`cardBlockPreview w-[120px] p-1 mx-3 mt-3 -mb-2 bg-bg-card border rounded-md shrink-0 border-border-light flex flex-col gap-1 rotate-[4deg] origin-center`}
    >
      {blocks
        .sort((a, b) => (a.data.position > b.data.position ? 1 : -1))
        .map((b) => (
          <PreviewBlock entityID={b.data.value} key={b.data.value} />
        ))}
    </div>
  );
}

function PreviewBlock(props: { entityID: string }) {
  let type = useEntity(props.entityID, "block/type");
  switch (type?.data.value) {
    case "text": {
      return (
        <div style={{ fontSize: "4px" }}>
          <RenderedTextBlock entityID={props.entityID} preview />
        </div>
      );
    }
    case "heading":
      return <HeadingPreviewBlock entityID={props.entityID} />;
    case "card":
      return (
        <div className="w-full h-4 shrink-0 rounded-md border border-border-light" />
      );
    case "image":
      return <ImagePreviewBlock entityID={props.entityID} />;
    default:
      null;
  }
}

function HeadingPreviewBlock(props: { entityID: string }) {
  let headingLevel = useEntity(props.entityID, "block/heading-level");
  return (
    <div className={HeadingStyle[headingLevel?.data.value || 1]}>
      <RenderedTextBlock entityID={props.entityID} preview />
    </div>
  );
}

const HeadingStyle = {
  1: "text-[6px] font-bold",
  2: "text-[5px] font-bold ",
  3: "text-[4px] font-bold italic text-secondary ",
} as { [level: number]: string };

function ImagePreviewBlock(props: { entityID: string }) {
  let image = useEntity(props.entityID, "block/image");
  return (
    <div className="relative group/image flex w-full justify-center">
      <img
        alt={""}
        src={image?.data.src}
        height={image?.data.height}
        width={image?.data.width}
        className=""
      />
    </div>
  );
}
