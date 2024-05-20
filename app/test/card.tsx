import { ButtonPrimary } from "../../components/Buttons";

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
}) => {
  return (
    <>
      {/* if the card is the first one in the list, remove this div... can we do with :before? */}
      {!props.first && <div className="w-6 md:snap-center" />}
      <div
        id={props.id}
        className={`
          p-3 w-[calc(100vw-12px)] md:w-[calc(50vw-24px)] max-w-prose
          bg-bg-card border rounded-lg
          grow flex flex-col gap-2
          snap-center
          ${props.focused ? "drop-shadow-lg border-grey-80" : "border-grey-90 "}`}
      >
        {props.children}
        <AddCardButton
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
        </div>
      </div>
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
