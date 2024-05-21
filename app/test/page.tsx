"use client";

import { useState } from "react";
import useMeasure from "react-use-measure";
import { PageHeader } from "./header";
import { Card } from "./card";

export type imageArgs = {
  url: string;
  repeat: boolean;
  size: number;
};

export default function Index() {
  let [cardRef, { width: cardWidth }] = useMeasure();
  let [cards, setCards] = useState([0]);
  let [focusedCardIndex, setFocusedCardIndex] = useState(0);
  let [pageBGImage, setPageBGImage] = useState({
    url: "./test-image.jpg",
    repeat: true,
    size: 500,
  });

  return (
    <div
      className="pageWrapper h-screen flex flex-col pt-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${pageBGImage.url})`,
        backgroundRepeat: pageBGImage.repeat ? "repeat" : "no-repeat",
        backgroundSize: !pageBGImage.repeat ? "cover" : pageBGImage.size,
      }}
    >
      <PageHeader
        pageBGImage={pageBGImage}
        setPageBGImage={(imageArgs) =>
          setPageBGImage((s) => ({ ...s, ...imageArgs }))
        }
      />
      <div
        className="pageContentWrapper w-full relative overflow-x-scroll snap-x snap-mandatory no-scrollbar grow items-stretch flex "
        id="card-carousel"
      >
        <div className="pageContent flex py-4">
          <div style={{ width: `calc((100vw - ${cardWidth}px)/2)` }} />

          {cards.map((card, index) => (
            <div
              className="flex items-stretch"
              key={index}
              ref={index === 0 ? cardRef : null}
            >
              <Card
                first={index === 0}
                focused={index === focusedCardIndex}
                id={index.toString()}
                index={index}
                setFocusedCardIndex={setFocusedCardIndex}
                setCards={setCards}
                cards={cards}
                card={card}
                cardWidth={cardWidth}
              >
                Card {card}
              </Card>
            </div>
          ))}
          <div style={{ width: `calc((100vw - ${cardWidth}px)/2)` }} />
        </div>
      </div>
    </div>
  );
}
