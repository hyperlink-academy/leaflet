"use client";
import { useUIState } from "src/useUIState";
import { Blocks, focusBlock } from "./Blocks";
import useMeasure from "react-use-measure";
import { elementId } from "src/utils/elementId";
import { ThemePopover } from "./ThemeManager/ThemeSetter";
import { Media } from "./Media";
import { DesktopCardFooter } from "./DesktopFooter";
import { Replicache } from "replicache";
import { Fact, ReplicacheMutators, useReplicache } from "src/replicache";
import * as Popover from "@radix-ui/react-popover";
import { MoreOptionsTiny, DeleteSmall } from "./Icons";
import { useToaster } from "./Toast";

export function Cards(props: { rootCard: string }) {
  let cards = useUIState((s) => s.openCards);
  let [cardRef, { width: cardWidth }] = useMeasure();

  return (
    <div id="cards" className="cards flex pt-2 pb-8 sm:py-6">
      <div
        className="spacer flex justify-end items-start"
        style={{ width: `calc(50vw - ${cardWidth}px/2)` }}
      >
        <Media mobile={false} className="flex flex-col gap-2 mr-4 mt-2">
          <PageOptions entityID={props.rootCard} />
        </Media>
      </div>
      <div className="flex items-stretch" ref={cardRef}>
        <Card entityID={props.rootCard} first />
      </div>
      {cards.map((card) => (
        <div className="flex items-stretch" key={card}>
          <Card entityID={card} />
        </div>
      ))}
      <div
        className="spacer"
        style={{ width: `calc((100vw - ${cardWidth}px)/2)` }}
      />
    </div>
  );
}

export const PageOptions = (props: { entityID: string }) => {
  return (
    <>
      <ThemePopover entityID={props.entityID} />
    </>
  );
};

function Card(props: { entityID: string; first?: boolean }) {
  let { rep } = useReplicache();

  let focusedElement = useUIState((s) => s.focusedBlock);
  let focusedCardID =
    focusedElement?.type === "card"
      ? focusedElement.entityID
      : focusedElement?.parent;
  let isFocused = focusedCardID === props.entityID;

  return (
    <>
      {!props.first && <div className="w-6 md:snap-center" />}
      <div className="cardWrapper w-fit flex relative snap-center">
        <div
          onMouseDown={() => {
            if (rep) {
              focusCard(props.entityID, rep);
            }
          }}
          id={elementId.card(props.entityID).container}
          style={{
            backgroundColor: "rgba(var(--bg-card), var(--bg-card-alpha))",
          }}
          className={`
      card w-[calc(100vw-12px)] md:w-[calc(50vw-32px)] max-w-prose
      grow flex flex-col
      overflow-y-scroll no-scrollbar
      rounded-lg border
      ${isFocused ? "shadow-md border-border" : "border-border-light"}
    `}
        >
          {isFocused && <CardOptions />}
          <DesktopCardFooter parentID={props.entityID} />
          <Blocks entityID={props.entityID} />
        </div>
      </div>
    </>
  );
}

const CardOptions = () => {
  let toaster = useToaster();
  return (
    <Popover.Root>
      <Popover.Trigger className="cardOptionsTrigger px-2 py-1 w-fit absolute top-0 right-3 bg-border text-bg-card rounded-b-md">
        <MoreOptionsTiny />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          className="cardOptionsMenu bg-bg-card flex flex-col py-1 gap-0.5 border border-border rounded-md shadow-md"
        >
          <CardMenuItem
            onClick={() => {
              // TODO: Wire up delete card
              toaster(DeleteCardToast);
            }}
          >
            Delete Page <DeleteSmall />
          </CardMenuItem>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

const CardMenuItem = (props: {
  children: React.ReactNode;
  onClick: () => void;
}) => {
  return (
    <button
      className="cardOptionsMenuItem text-left text-secondary py-1 px-2 flex gap-2 font-bold hover:bg-accent hover:text-accentText "
      onClick={() => {
        props.onClick();
      }}
    >
      {props.children}
    </button>
  );
};

const DeleteCardToast = {
  content: (
    <div className="flex gap-2">
      You deleted a card.{" "}
      <button
        className="underline hover:font-bold italic"
        onClick={() => {
          // TODO: WIRE UP UNDO DELETE
        }}
      >
        Undo?
      </button>
    </div>
  ),
  type: "info",
  duration: 5000,
} as const;

export async function focusCard(
  cardID: string,
  rep: Replicache<ReplicacheMutators>,
  focusFirstBlock?: "focusFirstBlock",
) {
  // if this card is already focused,
  let focusedBlock = useUIState.getState().focusedBlock;
  if (
    (focusedBlock?.type == "card" && focusedBlock.entityID === cardID) ||
    (focusedBlock?.type === "block" && focusedBlock.parent === cardID)
  )
    // else set this card as focused
    useUIState.setState(() => ({
      focusedBlock: {
        type: "card",
        entityID: cardID,
      },
    }));

  setTimeout(async () => {
    // if we asked that the function focus the first block, do that
    if (focusFirstBlock === "focusFirstBlock") {
      let firstBlock = await rep.query(async (tx) => {
        let blocks = await tx
          .scan<
            Fact<"card/block">
          >({ indexName: "eav", prefix: `${cardID}-card/block` })
          .toArray();

        let firstBlock = blocks.sort((a, b) => {
          return a.data.position > b.data.position ? 1 : -1;
        })[0];

        if (!firstBlock) {
          return null;
        }

        let blockType = (
          await tx
            .scan<
              Fact<"block/type">
            >({ indexName: "eav", prefix: `${firstBlock.data.value}-block/type` })
            .toArray()
        )[0];

        if (!blockType) return null;

        return {
          value: firstBlock.data.value,
          type: blockType.data.value,
          position: firstBlock.data.position,
        };
      });

      if (firstBlock) {
        focusBlock(firstBlock, "start", "top");
      }
    }

    //scroll to card
    document.getElementById(elementId.card(cardID).container)?.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
    });
  }, 100);
}
