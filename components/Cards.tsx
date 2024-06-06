"use client";
import { useUIState } from "src/useUIState";
import { Blocks } from "./Blocks";
import useMeasure from "react-use-measure";
import { elementId } from "src/utils/elementId";

export function Cards(props: { rootCard: string }) {
  let cards = useUIState((s) => s.openCards);
  let [cardRef, { width: cardWidth }] = useMeasure();

  return (
    <div
      className="pageContentWrapper w-full relative overflow-x-scroll snap-x snap-mandatory no-scrollbar grow items-stretch flex h-full"
      id="card-carousel"
    >
      <div className="pageContent flex py-4">
        <div style={{ width: `calc((100vw - ${cardWidth}px)/2)` }} />
        <Card entityID={props.rootCard} first />
        {cards.map((card, index) => (
          <div
            className="flex items-stretch"
            key={card}
            ref={index === 0 ? cardRef : null}
          >
            <Card entityID={card} />
          </div>
        ))}
        <div style={{ width: `calc((100vw - ${cardWidth}px)/2)` }} />
      </div>
    </div>
  );
}

function Card(props: { entityID: string; first?: boolean }) {
  return (
    <>
      {!props.first && <div className="w-6 md:snap-center" />}
      <div
        id={elementId.card(props.entityID).container}
        className={`
      cardWrapper w-[calc(100vw-12px)] md:w-[calc(50vw-32px)] max-w-prose
      relative
      grow flex flex-col
      overflow-y-scroll no-scrollbar
      snap-center
      bg-bg-card rounded-lg border
      ${false ? "shadow-md border-border" : "border-border-light"}

    `}
      >
        <Blocks entityID={props.entityID} />
      </div>
    </>
  );
}

export function focusCard(id: string) {
  setTimeout(() => {
    let newCardID = document.getElementById(elementId.card(id).container);
    newCardID?.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
    });
  }, 10);
}
