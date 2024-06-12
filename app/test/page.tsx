"use client";

import { useState } from "react";
import useMeasure from "react-use-measure";
import { PageHeader } from "./Header";
import { Card } from "./Card";
import useIsMobile from "src/hooks/isMobile";

export type imageArgs = {
  url: string;
  repeat: boolean;
  size: number;
};

export default function Index() {
  let [cardRef, { width: cardWidth, height: cardHeight }] = useMeasure();
  let [cards, setCards] = useState([0, 1]);
  let [focusedCardIndex, setFocusedCardIndex] = useState(0);
  let [pageBGImage, setPageBGImage] = useState({
    url: "./test-image.jpg",
    repeat: true,
    size: 500,
  });
  let [optionsOpen, setOptionsOpen] = useState(false);

  let isMobile = useIsMobile();
  let isKeyboardUp = false;

  return (
    <div
      className="pageWrapper h-screen flex flex-col bg-cover bg-center bg-no-repeat items-stretch"
      style={{
        backgroundImage: `url(${pageBGImage.url})`,
        backgroundRepeat: pageBGImage.repeat ? "repeat" : "no-repeat",
        backgroundSize: !pageBGImage.repeat ? "cover" : pageBGImage.size,
      }}
    >
      <div
        className="pageContentWrapper w-full relative overflow-scroll snap-x snap-mandatory no-scrollbar grow items-stretch flex "
        id="card-carousel"
      >
        <div className="pageContent flex pt-2 pb-8 sm:py-6">
          <div
            className="flex justify-end items-start"
            style={{ width: `calc((100vw - ${cardWidth}px)/2)` }}
          >
            {!isMobile && (
              <div className="flex flex-col gap-2 mr-4 mt-2">
                <PageHeader
                  pageBGImage={pageBGImage}
                  setPageBGImage={(imageArgs) =>
                    setPageBGImage((s) => ({ ...s, ...imageArgs }))
                  }
                />
              </div>
            )}
          </div>

          {cards.map((card, index) => (
            <div
              className="flex items-stretch "
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
                cardHeight={cardHeight}
              >
                Card {card}
              </Card>
            </div>
          ))}
          <div style={{ width: `calc((100vw - ${cardWidth}px)/2)` }} />
        </div>
      </div>
      {/* can we remove this if keyboard is up??? */}
      {isMobile && !isKeyboardUp && (
        <div className="w-full pb-2 px-2 -mt-6 flex gap-2 flex-row-reverse items-center z-10">
          <PageHeader
            pageBGImage={pageBGImage}
            setPageBGImage={(imageArgs) =>
              setPageBGImage((s) => ({ ...s, ...imageArgs }))
            }
          />
        </div>
      )}

      {isMobile && isKeyboardUp && (
        <div>bold italic underline, link, h1, h2, h3, list options</div>
      )}
    </div>
  );
}
