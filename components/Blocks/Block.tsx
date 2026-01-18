"use client";

import { Fact, useEntity, useReplicache } from "src/replicache";
import { memo, useEffect, useState } from "react";
import { useUIState } from "src/useUIState";
import { useBlockMouseHandlers } from "./useBlockMouseHandlers";
import { useBlockKeyboardHandlers } from "./useBlockKeyboardHandlers";
import { useLongPress } from "src/hooks/useLongPress";
import { focusBlock } from "src/utils/focusBlock";
import { useHandleDrop } from "./useHandleDrop";
import { useEntitySetContext } from "components/EntitySetProvider";

import { TextBlock } from "./TextBlock/index";
import { ImageBlock } from "./ImageBlock";
import { PageLinkBlock } from "./PageLinkBlock";
import { ExternalLinkBlock } from "./ExternalLinkBlock";
import { EmbedBlock } from "./EmbedBlock";
import { MailboxBlock } from "./MailboxBlock";
import { AreYouSure } from "./DeleteBlock";
import { useIsMobile } from "src/hooks/isMobile";
import { DateTimeBlock } from "./DateTimeBlock";
import { RSVPBlock } from "./RSVPBlock";
import { elementId } from "src/utils/elementId";
import { ButtonBlock } from "./ButtonBlock";
import { PollBlock } from "./PollBlock";
import { BlueskyPostBlock } from "./BlueskyPostBlock";
import { CheckboxChecked } from "components/Icons/CheckboxChecked";
import { CheckboxEmpty } from "components/Icons/CheckboxEmpty";
import { LockTiny } from "components/Icons/LockTiny";
import { MathBlock } from "./MathBlock";
import { CodeBlock } from "./CodeBlock";
import { HorizontalRule } from "./HorizontalRule";
import { deepEquals } from "src/utils/deepEquals";
import { isTextBlock } from "src/utils/isTextBlock";
import { focusPage } from "src/utils/focusPage";
import { getBlocksWithType } from "src/replicache/getBlocks";

export type Block = {
  factID: string;
  parent: string;
  position: string;
  value: string;
  type: Fact<"block/type">["data"]["value"];
  listData?: {
    checklist?: boolean;
    listStyle?: "ordered" | "unordered";
    listNumber?: number;
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
  let { rep } = useReplicache();
  let mouseHandlers = useBlockMouseHandlers(props);
  let handleDrop = useHandleDrop({
    parent: props.parent,
    position: props.position,
    nextPosition: props.nextPosition,
  });
  let entity_set = useEntitySetContext();

  let { isLongPress, handlers } = useLongPress(() => {
    if (isTextBlock[props.type]) return;
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

  // THIS IS WHERE YOU SET WHETHER OR NOT AREYOUSURE IS TRIGGERED ON THE DELETE KEY
  useBlockKeyboardHandlers(props, areYouSure, setAreYouSure);

  return (
    <div
      {...(!props.preview ? { ...mouseHandlers, ...handlers } : {})}
      id={
        !props.preview ? elementId.block(props.entityID).container : undefined
      }
      onDragOver={
        !props.preview && entity_set.permissions.write
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
            }
          : undefined
      }
      onDrop={
        !props.preview && entity_set.permissions.write ? handleDrop : undefined
      }
      className={`
        blockWrapper relative
        flex flex-row gap-2
        px-3 sm:px-4
      ${
        !props.nextBlock
          ? "pb-3 sm:pb-4"
          : props.type === "heading" ||
              (props.listData && props.nextBlock?.listData)
            ? "pb-0"
            : "pb-2"
      }
      ${props.type === "blockquote" && props.previousBlock?.type === "blockquote" ? (!props.listData ? "-mt-3" : "-mt-1") : ""}
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
}, deepEqualsBlockProps);

function deepEqualsBlockProps(
  prevProps: BlockProps & { preview?: boolean },
  nextProps: BlockProps & { preview?: boolean },
): boolean {
  // Compare primitive fields
  if (
    prevProps.pageType !== nextProps.pageType ||
    prevProps.entityID !== nextProps.entityID ||
    prevProps.parent !== nextProps.parent ||
    prevProps.position !== nextProps.position ||
    prevProps.factID !== nextProps.factID ||
    prevProps.value !== nextProps.value ||
    prevProps.type !== nextProps.type ||
    prevProps.nextPosition !== nextProps.nextPosition ||
    prevProps.preview !== nextProps.preview
  ) {
    return false;
  }

  // Compare listData if present
  if (prevProps.listData !== nextProps.listData) {
    if (!prevProps.listData || !nextProps.listData) {
      return false; // One is undefined, the other isn't
    }

    if (
      prevProps.listData.checklist !== nextProps.listData.checklist ||
      prevProps.listData.parent !== nextProps.listData.parent ||
      prevProps.listData.depth !== nextProps.listData.depth ||
      prevProps.listData.listNumber !== nextProps.listData.listNumber ||
      prevProps.listData.listStyle !== nextProps.listData.listStyle
    ) {
      return false;
    }

    // Compare path array
    if (prevProps.listData.path.length !== nextProps.listData.path.length) {
      return false;
    }

    for (let i = 0; i < prevProps.listData.path.length; i++) {
      if (
        prevProps.listData.path[i].depth !== nextProps.listData.path[i].depth ||
        prevProps.listData.path[i].entity !== nextProps.listData.path[i].entity
      ) {
        return false;
      }
    }
  }

  // Compare nextBlock
  if (prevProps.nextBlock !== nextProps.nextBlock) {
    if (!prevProps.nextBlock || !nextProps.nextBlock) {
      return false; // One is null, the other isn't
    }

    if (
      prevProps.nextBlock.factID !== nextProps.nextBlock.factID ||
      prevProps.nextBlock.parent !== nextProps.nextBlock.parent ||
      prevProps.nextBlock.position !== nextProps.nextBlock.position ||
      prevProps.nextBlock.value !== nextProps.nextBlock.value ||
      prevProps.nextBlock.type !== nextProps.nextBlock.type
    ) {
      return false;
    }

    // Compare nextBlock's listData (using deepEquals for simplicity)
    if (
      !deepEquals(prevProps.nextBlock.listData, nextProps.nextBlock.listData)
    ) {
      return false;
    }
  }

  // Compare previousBlock
  if (prevProps.previousBlock !== nextProps.previousBlock) {
    if (!prevProps.previousBlock || !nextProps.previousBlock) {
      return false; // One is null, the other isn't
    }

    if (
      prevProps.previousBlock.factID !== nextProps.previousBlock.factID ||
      prevProps.previousBlock.parent !== nextProps.previousBlock.parent ||
      prevProps.previousBlock.position !== nextProps.previousBlock.position ||
      prevProps.previousBlock.value !== nextProps.previousBlock.value ||
      prevProps.previousBlock.type !== nextProps.previousBlock.type
    ) {
      return false;
    }

    // Compare previousBlock's listData (using deepEquals for simplicity)
    if (
      !deepEquals(
        prevProps.previousBlock.listData,
        nextProps.previousBlock.listData,
      )
    ) {
      return false;
    }
  }

  return true;
}

export const BaseBlock = (
  props: BlockProps & {
    preview?: boolean;
    areYouSure?: boolean;
    setAreYouSure?: (value: boolean) => void;
  },
) => {
  // BaseBlock renders the actual block content, delete states, controls spacing between block and list markers
  let BlockTypeComponent = BlockTypeComponents[props.type];
  let alignment = useEntity(props.value, "block/text-alignment")?.data.value;

  let alignmentStyle =
    props.type === "button" || props.type === "image"
      ? "justify-center"
      : "justify-start";

  if (alignment)
    alignmentStyle = {
      left: "justify-start",
      right: "justify-end",
      center: "justify-center",
      justify: "justify-start",
    }[alignment];

  if (!BlockTypeComponent) return <div>unknown block</div>;
  return (
    <div
      className={`blockContentWrapper w-full grow flex gap-2 z-1 ${alignmentStyle}`}
    >
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
  code: CodeBlock,
  math: MathBlock,
  card: PageLinkBlock,
  text: TextBlock,
  blockquote: TextBlock,
  heading: TextBlock,
  image: ImageBlock,
  link: ExternalLinkBlock,
  embed: EmbedBlock,
  mailbox: MailboxBlock,
  datetime: DateTimeBlock,
  rsvp: RSVPBlock,
  button: ButtonBlock,
  poll: PollBlock,
  "bluesky-post": BlueskyPostBlock,
  "horizontal-rule": HorizontalRule,
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

export const BlockLayout = (props: {
  isSelected?: boolean;
  children: React.ReactNode;
  className?: string;
  hasBackground?: "accent" | "page";
  borderOnHover?: boolean;
}) => {
  return (
    <div
      className={`block ${props.className} p-2 sm:p-3 w-full overflow-hidden
         ${props.isSelected ? "block-border-selected " : "block-border"}
         ${props.borderOnHover && "hover:border-accent-contrast! hover:outline-accent-contrast! focus-within:border-accent-contrast! focus-within:outline-accent-contrast!"}`}
      style={{
        backgroundColor:
          props.hasBackground === "accent"
            ? "var(--accent-light)"
            : props.hasBackground === "page"
              ? "rgb(var(--bg-page))"
              : "transparent",
      }}
    >
      {props.children}
    </div>
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
  let listStyle = useEntity(props.value, "block/list-style");
  let headingLevel = useEntity(props.value, "block/heading-level")?.data.value;
  let children = useEntity(props.value, "card/block");
  let folded =
    useUIState((s) => s.foldedBlocks.includes(props.value)) &&
    children.length > 0;

  let depth = props.listData?.depth;
  let { permissions } = useEntitySetContext();
  let { rep } = useReplicache();

  let [editingNumber, setEditingNumber] = useState(false);
  let [numberInputValue, setNumberInputValue] = useState("");

  useEffect(() => {
    if (!editingNumber) {
      setNumberInputValue("");
    }
  }, [editingNumber]);

  const handleNumberSave = async () => {
    if (!rep || !props.listData) return;

    const newNumber = parseInt(numberInputValue, 10);
    if (isNaN(newNumber) || newNumber < 1) {
      setEditingNumber(false);
      return;
    }

    const oldNumber = props.listData.listNumber || 1;
    const difference = newNumber - oldNumber;

    if (difference === 0) {
      setEditingNumber(false);
      return;
    }

    // Update this block's number
    await rep.mutate.assertFact({
      entity: props.value,
      attribute: "block/list-number",
      data: { type: "number", value: newNumber },
    });

    // Cascade to following blocks at the same depth
    const allBlocks = await rep.query((tx) => getBlocksWithType(tx, props.parent));
    if (allBlocks) {
      const currentIndex = allBlocks.findIndex((b) => b.value === props.value);
      for (let i = currentIndex + 1; i < allBlocks.length; i++) {
        const block = allBlocks[i];
        if (
          block.listData?.listStyle === "ordered" &&
          block.listData?.depth === props.listData.depth
        ) {
          const currentNumber = block.listData.listNumber || 1;
          await rep.mutate.assertFact({
            entity: block.value,
            attribute: "block/list-number",
            data: { type: "number", value: currentNumber + difference },
          });
        }
      }
    }

    setEditingNumber(false);
  };
  return (
    <div
      className={`shrink-0  flex justify-end items-center h-3 z-1
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
        {listStyle?.data.value === "ordered" ? (
          editingNumber ? (
            <input
              type="text"
              value={numberInputValue}
              onChange={(e) => setNumberInputValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onBlur={handleNumberSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleNumberSave();
                } else if (e.key === "Escape") {
                  setEditingNumber(false);
                }
              }}
              autoFocus
              className="text-secondary font-normal text-right min-w-[2rem] w-[2.2rem] bg-transparent border border-accent focus:outline-none px-1"
            />
          ) : (
            <div
              className="text-secondary font-normal text-right min-w-[2rem] cursor-pointer hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                if (permissions.write && listStyle?.data.value === "ordered") {
                  setNumberInputValue(String(props.listData?.listNumber || 1));
                  setEditingNumber(true);
                }
              }}
            >
              {props.listData?.listNumber || 1}.
            </div>
          )
        ) : (
          <div
            className={`h-[5px] w-[5px] rounded-full bg-secondary shrink-0 right-0 outline  outline-offset-1
                        ${
                          folded
                            ? "outline-secondary"
                            : ` ${children.length > 0 ? "sm:group-hover/list-marker:outline-secondary outline-transparent" : "outline-transparent"}`
                        }`}
          />
        )}
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
