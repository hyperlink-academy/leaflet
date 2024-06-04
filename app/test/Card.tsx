import React from "react";
import { ButtonPrimary } from "../../components/Buttons";
import { TextBlock, ImageBlock, CardBlock, ExternalLinkBlock } from "./Blocks";

export const Card = (props: {
  children: React.ReactNode;
  first?: boolean;
  focused?: boolean;
  id: string;
  index: number;
  setFocusedCardIndex: (index: number) => void;
  setCards: ([]) => void;
  cards: number[];
  card: number;
  cardWidth: number;
  cardHeight: number;
}) => {
  return (
    <>
      {/* if the card is the first one in the list, remove this div... can we do with :before? */}
      {!props.first && <div className="w-6 md:snap-center" />}
      <div
        id={props.id}
        className={`
          cardWrapper w-[calc(100vw-12px)] md:w-[calc(50vw-32px)] max-w-prose
          relative
          grow flex flex-col
          overflow-y-scroll no-scrollbar
          snap-center
          bg-bg-card rounded-lg border
          ${props.focused ? "shadow-md border-border" : "border-border-light"}

        `}
      >
        <CardContent cardHeight={props.cardHeight} />
      </div>
      {/* <AddCardButton
          setCards={props.setCards}
          cards={props.cards}
          card={props.card}
          setFocusedCardIndex={props.setFocusedCardIndex}
          index={props.index}
        />
        {props.index !== 0 && (
          <RemoveCardButton
            setCards={props.setCards}
            cards={props.cards}
            index={props.index}
          />
        )}
       <div className="flex justify-between">
          <FocusCardButton
            setFocusedCardIndex={props.setFocusedCardIndex}
            index={props.index}
            cardWidth={props.cardWidth}
          />
          <FocusCardButton
            setFocusedCardIndex={props.setFocusedCardIndex}
            index={props.index}
            cardWidth={props.cardWidth}
          />
        </div> */}
    </>
  );
};

const AddCardButton = (props: {
  setCards: ([]) => void;
  setFocusedCardIndex: (index: number) => void;
  cards: number[];
  card: number;
  index: number;
}) => {
  return (
    <ButtonPrimary
      onClick={() => {
        //add a new card after this one
        props.setCards([...props.cards, props.card + 1]);

        // focus the new card
        props.setFocusedCardIndex(props.index + 1);

        //scroll the new card into view
        setTimeout(() => {
          let newCardID = document.getElementById((props.index + 1).toString());
          newCardID?.scrollIntoView({
            behavior: "smooth",
            inline: "nearest",
          });
        }, 100);
      }}
    >
      add card
    </ButtonPrimary>
  );
};

const RemoveCardButton = (props: {
  setCards: ([]) => void;
  cards: number[];
  index: number;
}) => {
  return (
    <ButtonPrimary
      onClick={() => {
        props.cards.splice(props.index, 1);
        props.setCards([...props.cards]);
      }}
    >
      remove card
    </ButtonPrimary>
  );
};

const FocusCardButton = (props: {
  setFocusedCardIndex: (index: number) => void;
  index: number;
  cardWidth: number;
}) => {
  return (
    <ButtonPrimary
      onClick={() => {
        //set the focused card to this one
        props.setFocusedCardIndex(props.index);

        // check if the card is off screen to the right or left
        let cardPosition =
          document
            .getElementById(props.index.toString())
            ?.getBoundingClientRect().left || 0;
        let isOffScreenLeft = cardPosition < 0;
        let isOffScreenRight =
          cardPosition + props.cardWidth > window.innerWidth;

        //if card is off screen, scroll one card width to the left or right so that the card is in view
        setTimeout(() => {
          document.getElementById("card-carousel")?.scrollBy({
            top: 0,
            left: isOffScreenLeft
              ? -props.cardWidth
              : isOffScreenRight
                ? props.cardWidth
                : 0,
            behavior: "smooth",
          });
        }, 100);
      }}
    >
      focus this card
    </ButtonPrimary>
  );
};

const CardContent = (props: { cardHeight: number }) => {
  return (
    <div className=" p-3 sm:p-4  flex flex-col">
      <h2>Chapter 1</h2>
      <TextBlock
        lines={6}
        defaultValue="It is a truth universally acknowledged, that a single man in possession of a good fortune must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters."
      />
      <TextBlock
        lines={2}
        defaultValue="“My dear Mr. Bennet,” said his lady to him one day, “have you heard that Netherfield Park is let at last?”"
      />
      <TextBlock lines={1} defaultValue="Mr. Bennet replied that he had not." />
      <TextBlock
        lines={2}
        defaultValue="“But it is,” returned she; “for Mrs. Long has just been here, and she told me all about it.”"
      />
      <TextBlock lines={1} defaultValue="Mr. Bennet made no answer." />
      <TextBlock
        lines={2}
        defaultValue="“Do not you want to know who has taken it?” cried his wife, impatiently."
      />
      <TextBlock
        lines={1}
        defaultValue="“You want to tell me, and I have no objection to hearing it.”"
      />
      <TextBlock lines={1} defaultValue="" />
      {/* <h4>Related Links</h4>
      <h3>Related Images</h3>
      <ImageBlock src="./test-image.jpg" cardHeight={props.cardHeight} />
      <ImageBlock src="./test-image-2.jpg" cardHeight={props.cardHeight} /> */}
      <ExternalLinkBlock />

      <CardBlock screenshot="./card1.png" title="Chapter 2" />

      <CardBlock
        screenshot="./card2.png"
        title="Notes"
        body="This is me just sort of blabbing on and on and on so that i can make htis thing wrap enough lines and see what it looks like. indeed blah blah blah thats what i have to say about it big yada yada energy"
      />
      <CardBlock
        screenshot="./card3.png"
        title="Footnote #3"
        body="what if first block very short?"
      />
      <CardBlock
        screenshot="./card5.png"
        body="This was invitation enough. “Why, my dear, you must know, Mrs. Long says
      that Netherfield is taken by a young man of large fortune from the north
      of England; that he came down on Monday in a chaise and four to see the
      place, and was so much delighted with it that he agreed with Mr. Morris
      immediately; that he is to take possession before Michaelmas, and some
      of his servants are to be in the house by the end of next week.”"
      />
    </div>
  );
};
