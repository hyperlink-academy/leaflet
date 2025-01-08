"use client";

import { Fact, useEntity, useReplicache } from "src/replicache";
import { memo, useEffect, useState } from "react";
import { useUIState } from "src/useUIState";
import { useBlockMouseHandlers } from "./useBlockMouseHandlers";
import { useBlockKeyboardHandlers } from "./useBlockKeyboardHandlers";
import { useLongPress } from "src/hooks/useLongPress";
import { focusBlock } from "src/utils/focusBlock";

import { TextBlock } from "components/Blocks/TextBlock";
import { ImageBlock } from "./ImageBlock";
import { PageLinkBlock } from "./PageLinkBlock";
import { ExternalLinkBlock } from "./ExternalLinkBlock";
import { EmbedBlock } from "./EmbedBlock";
import { MailboxBlock } from "./MailboxBlock";
import { HeadingBlock } from "./HeadingBlock";
import {
  CheckboxChecked,
  CheckboxEmpty,
  LockTiny,
  UnlockSmall,
  UnlockTiny,
} from "components/Icons";
import { AreYouSure } from "./DeleteBlock";
import { useEntitySetContext } from "components/EntitySetProvider";
import { Media } from "components/Media";
import { useIsMobile } from "src/hooks/isMobile";
import { DateTimeBlock } from "./DateTimeBlock";
import { RSVPBlock } from "./RSVPBlock";
import { elementId } from "src/utils/elementId";

export type Block = {
  factID: string;
  parent: string;
  position: string;
  value: string;
  type: Fact<"block/type">["data"]["value"];
  listData?: {
    checklist?: boolean;
    path: { depth: number; entity: string }[];
    parent: string;
    depth: number;
  };
};
export type BlockProps = {
  pageType: Fact<"page/type">["data"]["value"];
  entityID: string;
  parent: string;
  position: string;
  nextBlock: Block | null;
  previousBlock: Block | null;
  nextPosition: string | null;
} & Block;

export const Block = memo(function Block(
  props: BlockProps & { preview?: boolean },
) {
  // Block handles all block level events like
  // mouse events, keyboard events and longPress, and setting AreYouSure state
  // and shared styling like padding and flex for list layouting

  let mouseHandlers = useBlockMouseHandlers(props);

  // focus block on longpress, shouldnt the type be based on the block type (?)
  let { isLongPress, handlers } = useLongPress(() => {
    if (isLongPress.current) {
      focusBlock(
        { type: props.type, value: props.entityID, parent: props.parent },
        { type: "start" },
      );
    }
  });

  let selected = useUIState(
    (s) => !!s.selectedBlocks.find((b) => b.value === props.entityID),
  );

  let [areYouSure, setAreYouSure] = useState(false);

  useEffect(() => {
    if (!selected) {
      setAreYouSure(false);
    }
  }, [selected]);

  useBlockKeyboardHandlers(props, areYouSure, setAreYouSure);

  return (
    <div
      {...(!props.preview ? { ...mouseHandlers, ...handlers } : {})}
      id={
        !props.preview ? elementId.block(props.entityID).container : undefined
      }
      className={`
        blockWrapper relative
        flex flex-row gap-2
        px-3 sm:px-4
      ${
        props.type === "heading" ||
        (props.listData && props.nextBlock?.listData)
          ? "pb-0"
          : "pb-2"
      }
      ${
        !props.previousBlock
          ? props.type === "heading" || props.type === "text"
            ? "pt-2 sm:pt-3"
            : "pt-3 sm:pt-4"
          : "pt-1"
      }`}
    >
      {!props.preview && <BlockMultiselectIndicator {...props} />}
      <BaseBlock
        {...props}
        areYouSure={areYouSure}
        setAreYouSure={setAreYouSure}
      />
    </div>
  );
});

export const BaseBlock = (
  props: BlockProps & {
    preview?: boolean;
    areYouSure?: boolean;
    setAreYouSure?: (value: boolean) => void;
  },
) => {
  // BaseBlock renders the actual block content, delete states, controls spacing between block and list markers
  let BlockTypeComponent = BlockTypeComponents[props.type];
  if (!BlockTypeComponent) return <div>unknown block</div>;
  return (
    <div className="blockContentWrapper w-full grow flex gap-2 z-[1]">
      {props.listData && <ListMarker {...props} />}
      {props.areYouSure ? (
        <AreYouSure
          closeAreYouSure={() =>
            props.setAreYouSure && props.setAreYouSure(false)
          }
          type={props.type}
          entityID={props.entityID}
        />
      ) : (
        <BlockTypeComponent {...props} preview={props.preview} />
      )}
    </div>
  );
};

const BlockTypeComponents: {
  [K in Fact<"block/type">["data"]["value"]]: React.ComponentType<
    BlockProps & { preview?: boolean }
  >;
} = {
  card: PageLinkBlock,
  text: TextBlock,
  heading: HeadingBlock,
  image: ImageBlock,
  link: ExternalLinkBlock,
  embed: EmbedBlock,
  mailbox: MailboxBlock,
  datetime: DateTimeBlock,
  rsvp: RSVPBlock,
};

export const BlockMultiselectIndicator = (props: BlockProps) => {
  let { rep } = useReplicache();
  let isMobile = useIsMobile();

  let first = props.previousBlock === null;

  let isMultiselected = useUIState(
    (s) =>
      !!s.selectedBlocks.find((b) => b.value === props.entityID) &&
      s.selectedBlocks.length > 1,
  );

  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let isLocked = useEntity(props.value, "block/is-locked");

  let nextBlockSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.nextBlock?.value),
  );
  let prevBlockSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.previousBlock?.value),
  );

  if (isMultiselected || (isLocked?.data.value && isSelected))
    // not sure what multiselected and selected classes are doing (?)
    // use a hashed pattern for locked things. show this pattern if the block is selected, even if it isn't multiselected

    return (
      <>
        <div
          className={`
          blockSelectionBG multiselected selected
          pointer-events-none
          bg-border-light
          absolute right-2 left-2 bottom-0
          ${first ? "top-2" : "top-0"}
          ${!prevBlockSelected && "rounded-t-md"}
          ${!nextBlockSelected && "rounded-b-md"}
          `}
          style={
            isLocked?.data.value
              ? {
                  maskImage: "var(--hatchSVG)",
                  maskRepeat: "repeat repeat",
                }
              : {}
          }
        ></div>
        {isLocked?.data.value && (
          <div
            className={`
            blockSelectionLockIndicator z-10
            flex items-center
            text-border rounded-full
            absolute right-3

            ${
              props.type === "heading" || props.type === "text"
                ? "top-[6px]"
                : "top-0"
            }`}
          >
            <LockTiny className="bg-bg-page p-0.5 rounded-full w-5 h-5" />
          </div>
        )}
      </>
    );
};

export const ListMarker = (
  props: Block & {
    previousBlock?: Block | null;
    nextBlock?: Block | null;
  } & {
    className?: string;
  },
) => {
  let isMobile = useIsMobile();
  let checklist = useEntity(props.value, "block/check-list");
  let headingLevel = useEntity(props.value, "block/heading-level")?.data.value;
  let children = useEntity(props.value, "card/block");
  let folded =
    useUIState((s) => s.foldedBlocks.includes(props.value)) &&
    children.length > 0;

  let depth = props.listData?.depth;
  let { permissions } = useEntitySetContext();
  let { rep } = useReplicache();
  return (
    <div
      className={`shrink-0  flex justify-end items-center h-3 z-[1]
                  ${props.className}
                  ${
                    props.type === "heading"
                      ? headingLevel === 3
                        ? "pt-[12px]"
                        : headingLevel === 2
                          ? "pt-[15px]"
                          : "pt-[20px]"
                      : "pt-[12px]"
                  }
            `}
      style={{
        width:
          depth &&
          `calc(${depth} * ${`var(--list-marker-width) ${checklist ? " + 20px" : ""} - 6px`} `,
      }}
    >
      <button
        onClick={() => {
          if (children.length > 0)
            useUIState.getState().toggleFold(props.value);
        }}
        className={`listMarker group/list-marker p-2 ${children.length > 0 ? "cursor-pointer" : "cursor-default"}`}
      >
        <div
          className={`h-[5px] w-[5px] rounded-full bg-secondary shrink-0 right-0 outline outline-1  outline-offset-1
                      ${
                        folded
                          ? "outline-secondary"
                          : ` ${children.length > 0 ? "sm:group-hover/list-marker:outline-secondary outline-transparent" : "outline-transparent"}`
                      }`}
        />
      </button>
      {checklist && (
        <button
          onClick={() => {
            if (permissions.write)
              rep?.mutate.assertFact({
                entity: props.value,
                attribute: "block/check-list",
                data: { type: "boolean", value: !checklist.data.value },
              });
          }}
          className={`pr-2 ${checklist?.data.value ? "text-accent-contrast" : "text-border"} ${permissions.write ? "cursor-default" : ""}`}
        >
          {checklist?.data.value ? <CheckboxChecked /> : <CheckboxEmpty />}
        </button>
      )}
    </div>
  );
};
