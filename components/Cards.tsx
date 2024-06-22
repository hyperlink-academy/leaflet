"use client";
import { useUIState } from "src/useUIState";
import { Blocks } from "./Blocks";
import useMeasure from "react-use-measure";
import { elementId } from "src/utils/elementId";
import { ThemePopover } from "./ThemeManager/ThemeSetter";
import { Media } from "./Media";
import { DesktopFooter } from "./DesktopFooter";
import { TextToolbar } from "./Toolbar";

export function Cards(props: { rootCard: string }) {
  let cards = useUIState((s) => s.openCards);
  let [cardRef, { width: cardWidth }] = useMeasure();

  return (
    <div className="pageContent flex pt-2 pb-8 sm:py-6">
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
  let focusedTextBlock = useUIState((s) => s.focusedBlock);
  let focusedBlockParent =
    focusedTextBlock?.type === "card" ? null : focusedTextBlock?.parent;
  return (
    <>
      {!props.first && <div className="w-6 md:snap-center" />}
      <div className="cardWrapper w-fit flex relative snap-center">
        <div
          id={elementId.card(props.entityID).container}
          style={{
            backgroundColor: "rgba(var(--bg-card), var(--bg-card-alpha))",
          }}
          className={`
      card w-[calc(100vw-12px)] md:w-[calc(50vw-32px)] max-w-prose
      grow flex flex-col
      overflow-y-scroll no-scrollbar
      rounded-lg border
      ${false ? "shadow-md border-border" : "border-border-light"}

    `}
        >
          <Media mobile={false} className="absolute bottom-4 w-full z-10 ">
            {focusedTextBlock &&
              focusedTextBlock.type === "block" &&
              focusedBlockParent === props.entityID && (
                <div className="w-fit mx-auto py-1 px-4 flex gap-2 items-center bg-bg-card border border-border rounded-full shadow-md">
                  <TextToolbar />
                </div>
              )}
          </Media>
          <Blocks entityID={props.entityID} />
        </div>
      </div>
    </>
  );
}

export function focusCard(id: string) {
  {
    /* TODO: focus into the first text block on the page */
  }
  setTimeout(() => {
    let newCardID = document.getElementById(elementId.card(id).container);
    newCardID?.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
    });
  }, 10);
}
