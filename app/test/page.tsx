"use client";

import { ButtonPrimary } from "../../components/Buttons";
import { useState } from "react";
import useMeasure from "react-use-measure";
import { PageHeader } from "./header";

export default function Index() {
  let [cardRef, { width: cardWidth }] = useMeasure();
  let [cards, setCards] = useState([0]);

  return (
    <div className="pageWrapper h-screen flex flex-col gap-4 py-4">
      <PageHeader />

      <div className="pageContentWrapper w-full overflow-x-scroll snap-mandatory snap-x grow items-stretch flex ">
        <div className="pageContent flex">
          <div style={{ width: `calc((100vw - ${cardWidth}px)/2)` }} />

          {cards.map((card, index) => (
            <div className="flex items-stretch" ref={cardRef}>
              <Card first={index === 0} key={index} id={index.toString()}>
                Card {card}
                <ButtonPrimary
                  onClick={() => {
                    //add a new card after this one
                    setCards([...cards, card + 1]);

                    //scroll the new card into view
                    document
                      .getElementById((index + 1).toString())
                      ?.scrollIntoView();
                  }}
                >
                  add card
                </ButtonPrimary>
                {index !== 0 && (
                  <ButtonPrimary
                    onClick={() => {
                      cards.splice(index, 1);
                      setCards([...cards]);
                    }}
                  >
                    remove card
                  </ButtonPrimary>
                )}
                {/* <ButtonPrimary onClick={() => {}}>
                  focus this card
                </ButtonPrimary> */}
              </Card>
            </div>
          ))}

          <div
            style={{ width: `calc((100vw / 2) - ${cardWidth}px + 12px )` }}
          />
        </div>
      </div>
    </div>
  );
}

const Card = (props: {
  children: React.ReactNode;
  first?: boolean;
  id: string;
}) => {
  return (
    <>
      {/* if the card is the first one in the list, remove this div... can we do with :before? */}
      {!props.first && <div className="w-6 snap-center" />}
      <div
        id={props.id}
        className={`p-3 w-[calc(50vw-24px)] max-w-prose bg-bg-card border border-grey-80 rounded-lg grow flex flex-col gap-2 ${props.first && "snap-center"}`}
      >
        {props.children}
      </div>
    </>
  );
};
