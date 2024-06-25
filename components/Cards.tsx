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
          onClick={() => {
            if (rep) {
              focusCard(props.entityID, focusedCardID, rep);
              console.log("focusing card");
            } else console.log("already focused");
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
          <DesktopCardFooter parentID={props.entityID} />
          <Blocks entityID={props.entityID} />
        </div>
      </div>
    </>
  );
}

export async function focusCard(
  cardID: string,
  focusedCardID: string | undefined,
  rep: Replicache<ReplicacheMutators>,
  focusFirstBlock?: "focusFirstBlock",
) {
  {
    /* TODO: focus into the first text block on the page */
  }

  // if this card is already focused,

  // else this this card as focused
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

        return { value: firstBlock.data.value, type: blockType.data.value };
      });

      if (firstBlock) {
        focusBlock(firstBlock, "start", "top");
      }
      console.log("focusing first block");
    }

    //scroll to card
    {
      document
        .getElementById(elementId.card(cardID).container)
        ?.scrollIntoView({
          behavior: "smooth",
          inline: "nearest",
        });
      console.log("scrolling to card");
    }
  }, 100);
}
