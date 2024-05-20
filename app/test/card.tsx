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
          bg-bg-card rounded-lg border
          grow flex flex-col gap-2
          snap-center
          overflow-y-scroll no-scrollbar
          ${props.focused ? "shadow-md border-grey-80" : "border-grey-90"}`}
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

        <div>
          {" "}
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis ac quam
          in tortor sollicitudin lobortis. Quisque vitae massa sit amet quam
          tristique maximus. Aliquam cursus bibendum nunc eu tempor. Ut metus
          orci, ornare quis rutrum in, pulvinar in nulla. Morbi sapien lectus,
          consectetur quis ultricies at, porttitor sit amet mi. Donec ex lectus,
          condimentum in ligula ut, luctus sodales magna. Vivamus porta pulvinar
          sapien vel sagittis. Aliquam vel sem scelerisque, bibendum lectus et,
          dignissim dolor. Fusce ullamcorper ante in purus pellentesque, quis
          iaculis ex egestas. Vestibulum vel leo in orci commodo ultricies quis
          a elit. Etiam vehicula magna in turpis iaculis efficitur. Aliquam
          massa tortor, dapibus et tellus a, volutpat tempus leo. Cras ac nisl
          semper, porttitor ante eget, feugiat quam. Nulla nibh nulla,
          vestibulum in dolor eu, dapibus sodales nisl. Proin lacus orci, congue
          id accumsan ut, lobortis in libero. Integer eget massa dictum, ornare
          lacus et, aliquam enim. Ut ornare urna vel pharetra dictum. Nullam
          fermentum, purus ac faucibus fringilla, elit enim posuere massa,
          volutpat porta lacus arcu vel eros. Integer sagittis dolor nec velit
          vulputate pulvinar. Quisque vel orci orci. Donec augue ipsum, lobortis
          in sapien aliquam, interdum cursus ipsum. Donec consectetur tristique
          elit. Sed volutpat congue luctus. Mauris vitae arcu eu ex congue
          molestie. Aliquam erat volutpat. Fusce sed ipsum eros. Donec semper
          neque ut dolor aliquam hendrerit. Praesent et tincidunt nisi. Integer
          sollicitudin urna eros, non aliquam neque semper in. Nulla eu nunc at
          urna auctor bibendum ut eu mauris. Nullam ultricies lorem ut nibh
          tristique, vitae euismod tellus placerat. Aliquam euismod, augue ac
          sollicitudin molestie, neque tellus bibendum arcu, quis sollicitudin
          ipsum risus eget dolor. Phasellus consectetur pellentesque urna in
          maximus. Curabitur dignissim tortor quis lorem elementum scelerisque.
          Vestibulum ac rutrum nisl. Sed neque turpis, commodo a augue a,
          hendrerit pretium dui. Cras ut augue vehicula, scelerisque sem ac,
          dictum justo. Phasellus egestas lorem sed est elementum finibus. Proin
          ultrices rutrum neque, at varius arcu pellentesque in. Quisque
          suscipit elit eu ante viverra bibendum et quis mauris. Sed
          pellentesque aliquet dolor at tempus. Donec eu nulla in ligula cursus
          ultrices. Sed quis tristique purus. Duis semper, urna in facilisis
          dapibus, leo ligula gravida tortor, vitae dignissim lorem orci vitae
          ante. Integer auctor ipsum vitae risus scelerisque facilisis. Vivamus
          molestie in purus eu hendrerit. Ut laoreet tortor ut vestibulum
          gravida. Curabitur in orci a quam lacinia iaculis id ut ipsum. Ut nec
          lorem sed mauris condimentum semper eget vitae lorem. Aenean pretium
          ipsum sit amet massa auctor feugiat. Maecenas malesuada imperdiet leo,
          non tempus nibh suscipit eget. Fusce eu diam ligula. Quisque at ornare
          massa. Suspendisse potenti. Fusce convallis, dolor rutrum elementum
          commodo, lacus dui vestibulum lectus, non maximus quam metus finibus
          libero.
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
