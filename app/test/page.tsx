"use client";

import { Home } from "../../components/Icons";
import { ButtonPrimary } from "../../components/Buttons";
import { useState } from "react";
import useMeasure from "react-use-measure";

export default function Index() {
  let [cardRef, { width: cardWidth }] = useMeasure();
  let [spacerRef, { width: spacerWidth }] = useMeasure();

  let [cardTwo, setCardTwo] = useState(false);
  let [cardMany, setCardMany] = useState(false);

  return (
    <div className="pageWrapper h-screen flex flex-col gap-4 py-4">
      <div className="pageHeader shrink-0 flex justify-between grow-0 mx-4">
        <div className="w-[3px] bg-test h-6 mx-auto" />
        {/* <div className="flex gap-4 items-center">
          <div className="text-grey-55">
            <Home />
          </div>

          <ButtonPrimary>Share!</ButtonPrimary>
        </div>
        <div>theme</div> */}
      </div>

      <div className="pageContentWrapper w-full overflow-x-scroll snap-mandatory snap-x grow items-stretch flex ">
        <div className="pageContent flex mx-auto">
          <div style={{ width: `calc((100vw - ${cardWidth}px)/2)` }} />
          <div className="h-full flex items-stretch" ref={cardRef}>
            <Card first>
              <ButtonPrimary
                onClick={() => {
                  setCardTwo(!cardTwo);
                }}
              >
                toggle card 2
              </ButtonPrimary>
              <ButtonPrimary
                onClick={() => {
                  setCardMany(!cardMany);
                }}
              >
                toggle card many
              </ButtonPrimary>
            </Card>
          </div>
          {cardTwo && <Card>Card 2</Card>}
          {cardMany && (
            <>
              <Card>Card 2</Card>
              <Card>Card 3</Card>
              <Card>Card 4</Card>
              <Card>Card 5</Card>
              <Card>Card 6</Card>
              <Card>Card 7</Card>
            </>
          )}
          <div
            ref={spacerRef}
            style={{ width: `calc((100vw / 2) - ${cardWidth}px)` }}
          />
        </div>
      </div>
    </div>
  );
}

const Card = (props: { children: React.ReactNode; first?: boolean }) => {
  return (
    <>
      {/* if the card is the first one in the list, remove this div... can we do with :before? */}
      {!props.first && <div className="w-8 snap-center" />}
      <div
        className={`p-3 w-[calc(50vw-24px)] max-w-[500px] bg-bg-card border border-grey-80 rounded-lg grow flex flex-col gap-2 ${props.first && "snap-center"}`}
      >
        {props.children}
      </div>
    </>
  );
};
