"use client";
import { useUIState } from "src/useUIState";
import { Blocks, focusBlock } from "components/Blocks";
import useMeasure from "react-use-measure";
import { elementId } from "src/utils/elementId";
import { ThemePopover } from "./ThemeManager/ThemeSetter";
import { Media } from "./Media";
import { DesktopCardFooter } from "./DesktopFooter";
import { Replicache } from "replicache";
import {
  Fact,
  ReplicacheMutators,
  useReferenceToEntity,
  useReplicache,
} from "src/replicache";
import * as Popover from "@radix-ui/react-popover";
import { MoreOptionsTiny, DeleteSmall, CloseTiny, PopoverArrow } from "./Icons";
import { useToaster } from "./Toast";
import { ShareOptions } from "./ShareOptions";
import { MenuItem, Menu } from "./Layout";
import { useEntitySetContext } from "./EntitySetProvider";
import { HomeButton } from "./HomeButton";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { DraftPostOptions } from "./Blocks/MailboxBlock";

export function Cards(props: { rootCard: string }) {
  let openCards = useUIState((s) => s.openCards);
  let params = useSearchParams();
  let openCard = params.get("openCard");
  useEffect(() => {
    if (openCard) {
    }
  }, [openCard, props.rootCard]);
  let cards = [...openCards];
  if (openCard && !cards.includes(openCard)) cards.push(openCard);

  return (
    <div
      id="cards"
      className="cards flex pt-2 pb-8 sm:py-6"
      onClick={(e) => {
        e.currentTarget === e.target && blurCard();
      }}
    >
      <div
        className="spacer flex justify-end items-start"
        style={{ width: `calc(50vw - ((var(--card-width-units)/2))` }}
        onClick={(e) => {
          e.currentTarget === e.target && blurCard();
        }}
      >
        <Media mobile={false} className="h-full">
          <div className="flex flex-col h-full justify-between mr-4 mt-1">
            <div className="flex flex-col justify-center gap-2 ">
              <ShareOptions rootEntity={props.rootCard} />
              <PageOptions entityID={props.rootCard} />
              <hr className="text-border my-3" />
              <HomeButton />
            </div>
          </div>
        </Media>
      </div>
      <div className="flex items-stretch">
        <Card entityID={props.rootCard} first />
      </div>
      {cards.map((card) => (
        <div className="flex items-stretch" key={card}>
          <Card entityID={card} />
        </div>
      ))}
      <div
        className="spacer"
        style={{ width: `calc(50vw - ((var(--card-width-units)/2))` }}
        onClick={(e) => {
          e.currentTarget === e.target && blurCard();
        }}
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
  let { rep } = useReplicache();
  let isDraft = useReferenceToEntity("mailbox/draft", props.entityID);

  let focusedElement = useUIState((s) => s.focusedBlock);
  let focusedCardID =
    focusedElement?.type === "card"
      ? focusedElement.entityID
      : focusedElement?.parent;
  let isFocused = focusedCardID === props.entityID;

  return (
    <>
      {!props.first && (
        <div
          className="w-6 lg:snap-center"
          onClick={(e) => {
            e.currentTarget === e.target && blurCard();
          }}
        />
      )}
      <div className="cardWrapper w-fit flex relative snap-center">
        <div
          onMouseDown={(e) => {
            if (e.defaultPrevented) return;
            if (rep) {
              focusCard(props.entityID, rep);
            }
          }}
          id={elementId.card(props.entityID).container}
          style={{
            backgroundColor: "rgba(var(--bg-card), var(--bg-card-alpha))",
            width: "var(--card-width-units)",
          }}
          className={`
      card
      grow flex flex-col
      overscroll-y-none
      overflow-y-scroll no-scrollbar
      rounded-lg border
      ${isFocused ? "shadow-md border-border" : "border-border-light"}
    `}
        >
          <Media mobile={true}>
            {!props.first && <CardOptions entityID={props.entityID} />}
          </Media>
          <DesktopCardFooter cardID={props.entityID} />
          {isDraft.length > 0 && (
            <div
              className={`cardStatus pt-[6px] pb-1 ${!props.first ? "pr-10 pl-3 sm:px-4" : "px-3 sm:px-4"} border-b border-border text-tertiary`}
              style={{
                backgroundColor:
                  "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-card)) 85%)",
              }}
            >
              <DraftPostOptions mailboxEntity={isDraft[0].entity} />
            </div>
          )}
          <Blocks entityID={props.entityID} />
        </div>
        <Media mobile={false}>
          {isFocused && !props.first && (
            <CardOptions entityID={props.entityID} />
          )}
        </Media>
      </div>
    </>
  );
}

const CardOptions = (props: { entityID: string }) => {
  let permission = useEntitySetContext().permissions.write;
  return (
    <div className=" z-10 w-fit absolute sm:top-2 sm:-right-[18px] top-0 right-3 flex sm:flex-col flex-row-reverse gap-1 items-start">
      <button
        className="p-1 pt-[10px] sm:p-0.5 sm:pl-0 bg-border text-bg-card sm:rounded-r-md sm:rounded-l-none rounded-b-md hover:bg-accent-1 hover:text-accent-2"
        onClick={() => {
          useUIState.getState().closeCard(props.entityID);
        }}
      >
        <CloseTiny />
      </button>
      {/* {permission && <OptionsMenu/>} */}
    </div>
  );
};

const OptionsMenu = () => {
  let toaster = useToaster();
  return (
    <Menu
      trigger={
        <div
          className={`cardOptionsTrigger
      shrink-0 sm:h-8 sm:w-5 h-5 w-8
      bg-bg-card text-border
      border sm:border-l-0 border-t-1 border-border sm:rounded-r-md sm:rounded-l-none rounded-b-md
      sm:hover:border-r-2 hover:border-b-2 hover:border-y-2 hover:border-t-1
      flex items-center justify-center`}
        >
          <MoreOptionsTiny className="sm:rotate-90" />
        </div>
      }
    >
      <MenuItem
        onSelect={(e) => {
          // TODO: Wire up delete card
          toaster(DeleteCardToast);
        }}
      >
        Delete Page <DeleteSmall />
      </MenuItem>
    </Menu>
  );
};

const CardMenuItem = (props: {
  children: React.ReactNode;
  onClick: () => void;
}) => {
  return (
    <button
      className="cardOptionsMenuItem z-10 text-left text-secondary py-1 px-2 flex gap-2 hover:bg-accent-1 hover:text-accent-2"
      onClick={() => {
        props.onClick();
      }}
    >
      {props.children}
    </button>
  );
};

const DeleteCardToast = {
  content: (
    <div className="flex gap-2">
      You deleted a card.{" "}
      <button
        className="underline font-bold sm:font-normal sm:hover:font-bold italic"
        onClick={() => {
          // TODO: WIRE UP UNDO DELETE
        }}
      >
        Undo?
      </button>
    </div>
  ),
  type: "info",
  duration: 5000,
} as const;

export async function focusCard(
  cardID: string,
  rep: Replicache<ReplicacheMutators>,
  focusFirstBlock?: "focusFirstBlock",
) {
  // if this card is already focused,
  let focusedBlock = useUIState.getState().focusedBlock;
  if (
    (focusedBlock?.type == "card" && focusedBlock.entityID === cardID) ||
    (focusedBlock?.type === "block" && focusedBlock.parent === cardID)
  )
    return;
  // else set this card as focused
  useUIState.setState(() => ({
    focusedBlock: {
      type: "card",
      entityID: cardID,
    },
  }));

  setTimeout(async () => {
    //scroll to card
    document.getElementById(elementId.card(cardID).container)?.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
    });

    // if we asked that the function focus the first block, do that

    if (focusFirstBlock === "focusFirstBlock") {
      let firstBlock = await rep.query(async (tx) => {
        let blocks = await tx
          .scan<
            Fact<"card/block">
          >({ indexName: "eav", prefix: `${cardID}-card/block` })
          .toArray();

        let firstBlock = blocks.sort((a, b) => {
          return a.data.position > b.data.position ? 1 : -1;
        })[0];

        if (!firstBlock) {
          return null;
        }

        let blockType = (
          await tx
            .scan<
              Fact<"block/type">
            >({ indexName: "eav", prefix: `${firstBlock.data.value}-block/type` })
            .toArray()
        )[0];

        if (!blockType) return null;

        return {
          value: firstBlock.data.value,
          type: blockType.data.value,
          parent: firstBlock.entity,
          position: firstBlock.data.position,
        };
      });

      if (firstBlock) {
        setTimeout(() => {
          focusBlock(firstBlock, { type: "start" });
        }, 500);
      }
    }
  }, 50);
}

const blurCard = () => {
  useUIState.setState(() => ({
    focusedBlock: null,
    selectedBlock: [],
  }));
};
