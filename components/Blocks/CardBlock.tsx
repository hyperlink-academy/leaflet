import { Block, BlockProps, focusBlock } from "components/Blocks";
import { focusCard } from "components/Cards";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { RenderedTextBlock } from "components/Blocks/TextBlock";
import { useDocMetadata } from "src/hooks/queries/useDocMetadata";
import { CloseTiny } from "components/Icons";
import { useEffect, useState } from "react";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useBlocks } from "src/hooks/queries/useBlocks";

export function CardBlock(props: BlockProps) {
  let { rep } = useReplicache();
  let card = useEntity(props.entityID, "block/card");
  let cardEntity = card ? card.data.value : props.entityID;
  let docMetadata = useDocMetadata(cardEntity);
  let permission = useEntitySetContext().permissions.write;

  let isSelected = useUIState(
    (s) =>
      (props.type !== "text" || s.selectedBlock.length > 1) &&
      s.selectedBlock.find((b) => b.value === props.entityID),
  );
  let isOpen = useUIState((s) => s.openCards).includes(cardEntity);

  let [areYouSure, setAreYouSure] = useState(false);

  useEffect(() => {
    if (!isSelected) {
      setAreYouSure(false);
    }
  }, [isSelected]);

  useEffect(() => {
    if (isSelected) {
    }
  }, [isSelected]);

  useEffect(() => {
    if (!isSelected) return;
    let listener = (e: KeyboardEvent) => {
      if (e.key === "Backspace" && permission) {
        if (e.defaultPrevented) return;
        if (areYouSure === false) {
          setAreYouSure(true);
        } else {
          e.preventDefault();
          useUIState.getState().closeCard(cardEntity);

          rep &&
            rep.mutate.removeBlock({
              blockEntity: props.entityID,
            });

          props.previousBlock &&
            focusBlock(props.previousBlock, { type: "end" });
        }
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [
    areYouSure,
    cardEntity,
    isSelected,
    permission,
    props.entityID,
    props.previousBlock,
    rep,
  ]);

  return (
    <div
      className={`
        cardBlockWrapper relative group/cardBlock
        w-full h-[104px]
        bg-bg-card border shadow-sm outline outline-1 outline-transparent   rounded-lg
        flex overflow-hidden
        ${isOpen ? "border-tertiary hover:outline-tertiary" : "border-border-light hover:outline-border-light"}
        ${isSelected ? "outline-tertiary border-tertiary" : "border-border-light hover:outline-border-light"}
        `}
      onKeyDown={(e) => {
        if (e.key === "Backspace" && permission) {
          e.stopPropagation();
          useUIState.getState().closeCard(cardEntity);

          rep &&
            rep.mutate.removeBlock({
              blockEntity: props.entityID,
            });

          console.log("delete card");
        }
      }}
    >
      {/* if the block is not focused, set are you sure to false*/}
      {areYouSure && isSelected ? (
        <div className="flex flex-col gap-1 w-full h-full place-items-center items-center font-bold py-4 bg-border-light">
          <div className="">Delete this Page?</div>
          <div className="flex gap-2">
            <button
              className="bg-accent-1 text-accent-2 px-2 py-1 rounded-md "
              onClick={(e) => {
                e.stopPropagation();
                useUIState.getState().closeCard(cardEntity);

                rep &&
                  rep.mutate.removeBlock({
                    blockEntity: props.entityID,
                  });
              }}
            >
              Delete
            </button>
            <button
              className="text-accent-1"
              onClick={() => setAreYouSure(false)}
            >
              Nevermind
            </button>
          </div>
        </div>
      ) : (
        <div
          className="w-full flex overflow-hidden cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            useUIState.getState().openCard(props.parent, cardEntity);
            if (rep) focusCard(cardEntity, rep);
          }}
        >
          <div className="py-1 grow min-w-0">
            {docMetadata.heading && (
              <div
                className={`cardBlockTitle bg-transparent -mb-3  border-none text-base font-bold outline-none resize-none align-top border  line-clamp-1`}
              >
                <RenderedTextBlock entityID={docMetadata.heading} />
              </div>
            )}
            {docMetadata.content && (
              <div
                className={`cardBlockDescription text-sm bg-transparent border-none outline-none resize-none align-top ${docMetadata.heading ? "line-clamp-3 max-h-16" : "line-clamp-4 max-h-[88px]"}`}
              >
                <RenderedTextBlock entityID={docMetadata.content} />
              </div>
            )}
          </div>
          <CardPreview entityID={cardEntity} />
          {permission && (
            <button
              className="absolute p-1 top-0.5 right-0.5 hover:text-accent-contrast text-secondary sm:hidden sm:group-hover/cardBlock:block"
              onClick={(e) => {
                e.stopPropagation();
                setAreYouSure(true);
              }}
            >
              <CloseTiny />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CardPreview(props: { entityID: string }) {
  let blocks = useBlocks(props.entityID);
  return (
    <div
      className={`cardBlockPreview w-[120px] p-1 mx-3 mt-3 -mb-2 bg-bg-card border rounded-md shrink-0 border-border-light flex flex-col gap-0.5 rotate-[4deg] origin-center`}
    >
      {blocks.map((b) => {
        if (b.listData)
          return (
            <div
              className="w-full flex flex-row"
              style={{ fontSize: "4px" }}
              key={b.factID}
            >
              <div
                className="flex-shrink-0"
                style={{ width: b.listData.depth * 3 }}
              ></div>{" "}
              *
              <PreviewBlock {...b} />
            </div>
          );
        return <PreviewBlock {...b} key={b.factID} />;
      })}
    </div>
  );
}

function PreviewBlock(props: Block) {
  switch (props.type) {
    case "text": {
      return (
        <div style={{ fontSize: "4px" }}>
          <RenderedTextBlock entityID={props.value} preview />
        </div>
      );
    }
    case "heading":
      return <HeadingPreviewBlock entityID={props.value} />;
    case "card":
      return (
        <div className="w-full h-4 shrink-0 rounded-md border border-border-light" />
      );
    case "image":
      return <ImagePreviewBlock entityID={props.value} />;
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
