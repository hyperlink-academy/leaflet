import { useEntity, useReplicache } from "src/replicache";
import { useEntitySetContext } from "./EntitySetProvider";
import { v7 } from "uuid";
import { BaseBlock, Block } from "./Blocks/Block";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AddBlockLarge,
  AddSmall,
  CanvasShrinkSmall,
  CanvasWidenSmall,
} from "./Icons";
import { useDrag } from "src/hooks/useDrag";
import { useLongPress } from "src/hooks/useLongPress";
import { focusBlock } from "src/utils/focusBlock";
import { elementId } from "src/utils/elementId";
import { useUIState } from "src/useUIState";
import useMeasure from "react-use-measure";
import { useIsMobile } from "src/hooks/isMobile";
import { Media } from "./Media";
import { TooltipButton } from "./Buttons";
import { useBlockKeyboardHandlers } from "./Blocks/useBlockKeyboardHandlers";

export function Canvas(props: { entityID: string; preview?: boolean }) {
  let entity_set = useEntitySetContext();
  let ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let abort = new AbortController();
    let isTouch = false;
    let startX: number, startY: number, scrollLeft: number, scrollTop: number;
    let el = ref.current;
    ref.current?.addEventListener(
      "wheel",
      (e) => {
        if (!el) return;
        if (
          (e.deltaX > 0 && el.scrollLeft >= el.scrollWidth - el.clientWidth) ||
          (e.deltaX < 0 && el.scrollLeft <= 0) ||
          (e.deltaY > 0 && el.scrollTop >= el.scrollHeight - el.clientHeight) ||
          (e.deltaY < 0 && el.scrollTop <= 0)
        ) {
          return;
        }
        e.preventDefault();
        el.scrollLeft += e.deltaX;
        el.scrollTop += e.deltaY;
      },
      { passive: false, signal: abort.signal },
    );
    return () => abort.abort();
  });

  let narrowWidth = useEntity(props.entityID, "canvas/narrow-width")?.data
    .value;

  return (
    <div
      ref={ref}
      id={elementId.page(props.entityID).canvasScrollArea}
      className={`
        canvasWrapper
        h-full w-fit mx-auto
        max-w-[calc(100vw-12px)]
        ${!narrowWidth ? "sm:max-w-[calc(100vw-128px)] lg:max-w-[calc(var(--page-width-units)*2 + 24px))]" : " sm:max-w-[var(--page-width-units)]"}
        rounded-lg
        overflow-y-scroll no-scrollbar
      `}
    >
      <AddCanvasBlockButton entityID={props.entityID} entity_set={entity_set} />
      <CanvasContent {...props} />
      <CanvasWidthHandle entityID={props.entityID} />
    </div>
  );
}

export function CanvasContent(props: { entityID: string; preview?: boolean }) {
  let blocks = useEntity(props.entityID, "canvas/block");
  let { rep } = useReplicache();
  let entity_set = useEntitySetContext();
  let height = Math.max(...blocks.map((f) => f.data.position.y), 0);
  return (
    <div
      onClick={async (e) => {
        if (e.currentTarget !== e.target) return;
        useUIState.setState(() => ({
          selectedBlocks: [],
          focusedEntity: { entityType: "page", entityID: props.entityID },
        }));
        useUIState.setState({
          focusedEntity: { entityType: "page", entityID: props.entityID },
        });
        document
          .getElementById(elementId.page(props.entityID).container)
          ?.scrollIntoView({
            behavior: "smooth",
            inline: "nearest",
          });
        if (e.detail === 2 || e.ctrlKey || e.metaKey) {
          let parentRect = e.currentTarget.getBoundingClientRect();
          let newEntityID = v7();
          await rep?.mutate.addCanvasBlock({
            newEntityID,
            parent: props.entityID,
            position: {
              x: Math.max(e.clientX - parentRect.left, 0),
              y: Math.max(e.clientY - parentRect.top - 12, 0),
            },
            factID: v7(),
            type: "text",
            permission_set: entity_set.set,
          });
          focusBlock(
            { type: "text", parent: props.entityID, value: newEntityID },
            { type: "start" },
          );
        }
      }}
      style={{
        minHeight: height + 512,
        contain: "size layout paint",
      }}
      className="relative h-full w-[1272px]"
    >
      <CanvasBackground entityID={props.entityID} />
      {blocks
        .sort((a, b) => {
          if (a.data.position.y === b.data.position.y) {
            return a.data.position.x - b.data.position.x;
          }
          return a.data.position.y - b.data.position.y;
        })
        .map((b) => {
          return (
            <CanvasBlock
              preview={props.preview}
              parent={props.entityID}
              entityID={b.data.value}
              position={b.data.position}
              factID={b.id}
              key={b.id}
            />
          );
        })}
    </div>
  );
}

function CanvasWidthHandle(props: { entityID: string }) {
  let canvasFocused = useUIState((s) => s.focusedEntity?.entityType === "page");
  let { rep } = useReplicache();
  let narrowWidth = useEntity(props.entityID, "canvas/narrow-width")?.data
    .value;
  return (
    <button
      onClick={() => {
        rep?.mutate.assertFact({
          entity: props.entityID,
          attribute: "canvas/narrow-width",
          data: {
            type: "boolean",
            value: !narrowWidth,
          },
        });
      }}
      className={`resizeHandle
        ${narrowWidth ? "cursor-e-resize" : "cursor-w-resize"} shrink-0 z-10
         ${canvasFocused ? "sm:block hidden" : "hidden"}
        w-[8px] h-12
        absolute top-1/2 right-0 -translate-y-1/2 translate-x-[3px]
        rounded-full bg-white  border-2 border-[#8C8C8C] shadow-[0_0_0_1px_white,_inset_0_0_0_1px_white]`}
    />
  );
}

const AddCanvasBlockButton = (props: {
  entityID: string;
  entity_set: { set: string };
}) => {
  let { rep } = useReplicache();
  let { permissions } = useEntitySetContext();
  let blocks = useEntity(props.entityID, "canvas/block");

  if (!permissions.write) return null;
  return (
    <div className="absolute right-2 sm:top-4 sm:right-4 bottom-2 sm:bottom-auto z-10 flex flex-col gap-1 justify-center">
      <TooltipButton
        side="left"
        open={blocks.length === 0 ? true : undefined}
        content={
          <div className="flex flex-col justify-end text-center px-1 leading-snug ">
            <div>Add a Block!</div>
            <div className="font-normal">or double click anywhere</div>
          </div>
        }
        className="w-fit p-2 rounded-full bg-accent-1 border-2 outline outline-transparent hover:outline-1 hover:outline-accent-1 border-accent-1 text-accent-2"
        onMouseDown={() => {
          let page = document.getElementById(
            elementId.page(props.entityID).canvasScrollArea,
          );
          if (!page) return;
          let newEntityID = v7();
          rep?.mutate.addCanvasBlock({
            newEntityID,
            parent: props.entityID,
            position: {
              x: page?.clientWidth + page?.scrollLeft - 468,
              y: 32 + page.scrollTop,
            },
            factID: v7(),
            type: "text",
            permission_set: props.entity_set.set,
          });
          setTimeout(() => {
            focusBlock(
              { type: "text", value: newEntityID, parent: props.entityID },
              { type: "start" },
            );
          }, 20);
        }}
      >
        <AddSmall />
      </TooltipButton>
    </div>
  );
};

function CanvasBlock(props: {
  preview?: boolean;
  entityID: string;
  parent: string;
  position: { x: number; y: number };
  factID: string;
}) {
  let width =
    useEntity(props.entityID, "canvas/block/width")?.data.value || 360;
  let rotation =
    useEntity(props.entityID, "canvas/block/rotation")?.data.value || 0;
  let [ref, rect] = useMeasure();
  let type = useEntity(props.entityID, "block/type");
  let { rep } = useReplicache();
  let isMobile = useIsMobile();

  let { permissions } = useEntitySetContext();
  let onDragEnd = useCallback(
    (dragPosition: { x: number; y: number }) => {
      if (!permissions.write) return;
      rep?.mutate.assertFact({
        id: props.factID,
        entity: props.parent,
        attribute: "canvas/block",
        data: {
          type: "spatial-reference",
          value: props.entityID,
          position: {
            x: props.position.x + dragPosition.x,
            y: props.position.y + dragPosition.y,
          },
        },
      });
    },
    [props, rep, permissions],
  );
  let { dragDelta, handlers } = useDrag({
    onDragEnd,
    delay: isMobile,
  });

  let widthOnDragEnd = useCallback(
    (dragPosition: { x: number; y: number }) => {
      rep?.mutate.assertFact({
        entity: props.entityID,
        attribute: "canvas/block/width",
        data: {
          type: "number",
          value: width + dragPosition.x,
        },
      });
    },
    [props, rep, width],
  );
  let widthHandle = useDrag({ onDragEnd: widthOnDragEnd });

  let RotateOnDragEnd = useCallback(
    (dragDelta: { x: number; y: number }) => {
      let originX = rect.x + rect.width / 2;
      let originY = rect.y + rect.height / 2;

      let angle =
        find_angle(
          { x: rect.x + rect.width, y: rect.y + rect.height },
          { x: originX, y: originY },
          {
            x: rect.x + rect.width + dragDelta.x,
            y: rect.y + rect.height + dragDelta.y,
          },
        ) *
        (180 / Math.PI);

      rep?.mutate.assertFact({
        entity: props.entityID,
        attribute: "canvas/block/rotation",
        data: {
          type: "number",
          value: (rotation + angle) % 360,
        },
      });
    },
    [props, rep, rect, rotation],
  );
  let rotateHandle = useDrag({ onDragEnd: RotateOnDragEnd });

  let { isLongPress, handlers: longPressHandlers } = useLongPress(() => {
    if (isLongPress.current && permissions.write) {
      focusBlock(
        {
          type: type?.data.value || "text",
          value: props.entityID,
          parent: props.parent,
        },
        { type: "start" },
      );
    }
  });
  let angle = 0;
  if (rotateHandle.dragDelta) {
    let originX = rect.x + rect.width / 2;
    let originY = rect.y + rect.height / 2;

    angle =
      find_angle(
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: originX, y: originY },
        {
          x: rect.x + rect.width + rotateHandle.dragDelta.x,
          y: rect.y + rect.height + rotateHandle.dragDelta.y,
        },
      ) *
      (180 / Math.PI);
  }
  let x = props.position.x + (dragDelta?.x || 0);
  let y = props.position.y + (dragDelta?.y || 0);
  let transform = `translate(${x}px, ${y}px) rotate(${rotation + angle}deg) scale(${!dragDelta ? "1.0" : "1.02"})`;
  let [areYouSure, setAreYouSure] = useState(false);
  let blockProps = useMemo(() => {
    return {
      pageType: "canvas" as const,
      preview: props.preview,
      type: type?.data.value || "text",
      value: props.entityID,
      factID: props.factID,
      position: "",
      nextPosition: "",
      entityID: props.entityID,
      parent: props.parent,
      nextBlock: null,
      previousBlock: null,
    };
  }, [props, type?.data.value]);
  useBlockKeyboardHandlers(blockProps, areYouSure, setAreYouSure);
  let isList = useEntity(props.entityID, "block/is-list");
  let isFocused = useUIState(
    (s) => s.focusedEntity?.entityID === props.entityID,
  );

  return (
    <div
      ref={ref}
      {...(!props.preview ? { ...longPressHandlers } : {})}
      {...(isMobile && permissions.write ? { ...handlers } : {})}
      id={props.preview ? undefined : elementId.block(props.entityID).container}
      className={`absolute group/canvas-block will-change-transform rounded-lg flex items-stretch origin-center p-3        `}
      style={{
        top: 0,
        left: 0,
        zIndex: dragDelta || isFocused ? 10 : undefined,
        width: width + (widthHandle.dragDelta?.x || 0),
        transform,
      }}
    >
      {/* the gripper show on hover, but longpress logic needs to be added for mobile*/}
      {!props.preview && permissions.write && <Gripper {...handlers} />}
      <div
        className={`contents ${dragDelta || widthHandle.dragDelta || rotateHandle.dragDelta ? "pointer-events-none" : ""} `}
      >
        <BaseBlock
          {...blockProps}
          listData={
            isList?.data.value
              ? { path: [], parent: props.parent, depth: 1 }
              : undefined
          }
          areYouSure={areYouSure}
          setAreYouSure={setAreYouSure}
        />
      </div>

      {!props.preview && permissions.write && (
        <div
          className={`resizeHandle
          cursor-e-resize shrink-0 z-10
          hidden group-hover/canvas-block:block
          w-[5px] h-6 -ml-[3px]
          absolute top-1/2 right-3 -translate-y-1/2 translate-x-[2px]
          rounded-full bg-white  border-2 border-[#8C8C8C] shadow-[0_0_0_1px_white,_inset_0_0_0_1px_white]`}
          {...widthHandle.handlers}
        />
      )}

      {!props.preview && permissions.write && (
        <div
          className={`rotateHandle
            cursor-grab shrink-0 z-10
            hidden group-hover/canvas-block:block
            w-[8px] h-[8px]
            absolute bottom-0 -right-0
            -translate-y-1/2 -translate-x-1/2
            rounded-full bg-white  border-2 border-[#8C8C8C] shadow-[0_0_0_1px_white,_inset_0_0_0_1px_white]`}
          {...rotateHandle.handlers}
        />
      )}
    </div>
  );
}

export const CanvasBackground = (props: { entityID: string }) => {
  let cardBackgroundImage = useEntity(
    props.entityID,
    "theme/card-background-image",
  );
  let cardBackgroundImageRepeat = useEntity(
    props.entityID,
    "theme/card-background-image-repeat",
  );
  let cardBackgroundImageOpacity =
    useEntity(props.entityID, "theme/card-background-image-opacity")?.data
      .value || 1;

  let canvasPattern =
    useEntity(props.entityID, "canvas/background-pattern")?.data.value ||
    "grid";
  return (
    <div
      className="w-full h-full pointer-events-none"
      style={{
        backgroundImage: `url(${cardBackgroundImage?.data.src}), url(${cardBackgroundImage?.data.fallback})`,
        backgroundRepeat: "repeat",
        backgroundPosition: "center",
        backgroundSize: cardBackgroundImageRepeat?.data.value || 500,
        opacity: cardBackgroundImage?.data.src ? cardBackgroundImageOpacity : 1,
      }}
    >
      <CanvasBackgroundPattern pattern={canvasPattern} />
    </div>
  );
};

export const CanvasBackgroundPattern = (props: {
  pattern: "grid" | "dot" | "plain";
  scale?: number;
}) => {
  if (props.pattern === "plain") return null;
  let patternID = `canvasPattern-${props.pattern}-${props.scale}`;
  if (props.pattern === "grid")
    return (
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none text-border-light"
      >
        <defs>
          <pattern
            id={patternID}
            x="0"
            y="0"
            width={props.scale ? 32 * props.scale : 32}
            height={props.scale ? 32 * props.scale : 32}
            viewBox={`${props.scale ? 16 * props.scale : 0} ${props.scale ? 16 * props.scale : 0} ${props.scale ? 32 * props.scale : 32} ${props.scale ? 32 * props.scale : 32}`}
            patternUnits="userSpaceOnUse"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M16.5 0H15.5L15.5 2.06061C15.5 2.33675 15.7239 2.56061 16 2.56061C16.2761 2.56061 16.5 2.33675 16.5 2.06061V0ZM0 16.5V15.5L2.06061 15.5C2.33675 15.5 2.56061 15.7239 2.56061 16C2.56061 16.2761 2.33675 16.5 2.06061 16.5L0 16.5ZM16.5 32H15.5V29.9394C15.5 29.6633 15.7239 29.4394 16 29.4394C16.2761 29.4394 16.5 29.6633 16.5 29.9394V32ZM32 15.5V16.5L29.9394 16.5C29.6633 16.5 29.4394 16.2761 29.4394 16C29.4394 15.7239 29.6633 15.5 29.9394 15.5H32ZM5.4394 16C5.4394 15.7239 5.66325 15.5 5.93939 15.5H10.0606C10.3367 15.5 10.5606 15.7239 10.5606 16C10.5606 16.2761 10.3368 16.5 10.0606 16.5H5.9394C5.66325 16.5 5.4394 16.2761 5.4394 16ZM13.4394 16C13.4394 15.7239 13.6633 15.5 13.9394 15.5H15.5V13.9394C15.5 13.6633 15.7239 13.4394 16 13.4394C16.2761 13.4394 16.5 13.6633 16.5 13.9394V15.5H18.0606C18.3367 15.5 18.5606 15.7239 18.5606 16C18.5606 16.2761 18.3367 16.5 18.0606 16.5H16.5V18.0606C16.5 18.3367 16.2761 18.5606 16 18.5606C15.7239 18.5606 15.5 18.3367 15.5 18.0606V16.5H13.9394C13.6633 16.5 13.4394 16.2761 13.4394 16ZM21.4394 16C21.4394 15.7239 21.6633 15.5 21.9394 15.5H26.0606C26.3367 15.5 26.5606 15.7239 26.5606 16C26.5606 16.2761 26.3367 16.5 26.0606 16.5H21.9394C21.6633 16.5 21.4394 16.2761 21.4394 16ZM16 5.4394C16.2761 5.4394 16.5 5.66325 16.5 5.93939V10.0606C16.5 10.3367 16.2761 10.5606 16 10.5606C15.7239 10.5606 15.5 10.3368 15.5 10.0606V5.9394C15.5 5.66325 15.7239 5.4394 16 5.4394ZM16 21.4394C16.2761 21.4394 16.5 21.6633 16.5 21.9394V26.0606C16.5 26.3367 16.2761 26.5606 16 26.5606C15.7239 26.5606 15.5 26.3367 15.5 26.0606V21.9394C15.5 21.6633 15.7239 21.4394 16 21.4394Z"
              fill="currentColor"
            />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          x="0"
          y="0"
          fill={`url(#${patternID})`}
        />
      </svg>
    );

  if (props.pattern === "dot") {
    return (
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className={`pointer-events-none text-border`}
      >
        <defs>
          <pattern
            id={patternID}
            x="0"
            y="0"
            width={props.scale ? 24 * props.scale : 24}
            height={props.scale ? 24 * props.scale : 24}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={props.scale ? 12 * props.scale : 12}
              cy={props.scale ? 12 * props.scale : 12}
              r="1"
              fill="currentColor"
            />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          x="0"
          y="0"
          fill={`url(#${patternID})`}
        />
      </svg>
    );
  }
};

const Gripper = (props: { onMouseDown: (e: React.MouseEvent) => void }) => {
  return (
    <div
      onMouseDown={props.onMouseDown}
      onPointerDown={props.onMouseDown}
      className="w-[9px] shrink-0 py-1 mr-1 bg-bg-card cursor-grab touch-none"
    >
      <Media mobile={false} className="h-full grid grid-cols-1 grid-rows-1 ">
        {/* the gripper is two svg's stacked on top of each other.
        One for the actual gripper, the other is an outline to endure the gripper stays visible on image backgrounds */}
        <div
          className="h-full col-start-1 col-end-2 row-start-1 row-end-2 bg-bg-page hidden group-hover/canvas-block:block"
          style={{ maskImage: "var(--gripperSVG2)", maskRepeat: "repeat" }}
        />
        <div
          className="h-full col-start-1 col-end-2 row-start-1 row-end-2 bg-tertiary hidden group-hover/canvas-block:block"
          style={{ maskImage: "var(--gripperSVG)", maskRepeat: "repeat" }}
        />
      </Media>
    </div>
  );
};

type P = { x: number; y: number };
function find_angle(P2: P, P1: P, P3: P) {
  if (P1.x === P3.x && P1.y === P3.y) return 0;
  let a = Math.atan2(P3.y - P1.y, P3.x - P1.x);
  let b = Math.atan2(P2.y - P1.y, P2.x - P1.x);
  return a - b;
}
