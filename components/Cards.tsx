"use client";
import { useUIState } from "src/useUIState";
import { Blocks } from "./Blocks";
import useMeasure from "react-use-measure";
import { elementId } from "src/utils/elementId";
import { ThemePopover } from "./ThemeManager/ThemeSetter";

export function Cards(props: { rootCard: string }) {
  let cards = useUIState((s) => s.openCards);
  let [cardRef, { width: cardWidth }] = useMeasure();

  return (
    <div className="pageContent flex py-4">
      <div
        className="flex justify-end items-start"
        style={{ width: `calc((100vw - ${cardWidth}px)/2)` }}
      >
        <div className="flex flex-col gap-2 mr-4 mt-2">
          <PageOptions entityID={props.rootCard} />
        </div>
      </div>
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
  return (
    <>
      {!props.first && <div className="w-6 md:snap-center" />}
      <div
        id={elementId.card(props.entityID).container}
        style={{
          backgroundColor: "rgba(var(--bg-card), var(--bg-card-alpha))",
        }}
        className={`
      cardWrapper w-[calc(100vw-12px)] md:w-[calc(50vw-32px)] max-w-prose
      relative
      grow flex flex-col
      overflow-y-scroll no-scrollbar
      snap-center
      rounded-lg border
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
