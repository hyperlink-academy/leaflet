import { useEntity, useReplicache } from "src/replicache";
import { useEntitySetContext } from "./EntitySetProvider";
import { v7 } from "uuid";
import { BaseBlock, Block } from "./Blocks/Block";
import { useCallback, useEffect, useRef, useState } from "react";
import { AddBlockLarge, AddSmall } from "./Icons";
import { useDrag } from "src/hooks/useDrag";
import { useLongPress } from "src/hooks/useLongPress";
import { focusBlock } from "src/utils/focusBlock";
import { elementId } from "src/utils/elementId";
import { useUIState } from "src/useUIState";
import useMeasure from "react-use-measure";

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
        e.preventDefault();
        if (!el) return;
        el.scrollLeft += e.deltaX;
        el.scrollTop += e.deltaY;
      },
      { passive: false, signal: abort.signal },
    );
    return () => abort.abort();
  });

  return (
    <div
      ref={ref}
      id={elementId.page(props.entityID).canvasScrollArea}
      className={`
        h-full
  canvasWrapper mx-auto
  w-fit
  max-w-[calc(100vw-12px)] sm:max-w-[calc(100vw-128px)] lg:max-w-[1152px]
  bg-white rounded-lg
  overflow-y-scroll no-scrollbar
`}
    >
      <AddCanvasBlockButton entityID={props.entityID} entity_set={entity_set} />
      <CanvasContent {...props} />
    </div>
  );
}

export function CanvasContent(props: { entityID: string; preview?: boolean }) {
  let blocks = useEntity(props.entityID, "canvas/block");
  let { rep } = useReplicache();
  let [height, setHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    setHeight(
      document.getElementById(elementId.page(props.entityID).canvasScrollArea)
        ?.scrollHeight,
    );
  }, [blocks, props.entityID]);
  return (
    <div
      onClick={(e) => {
        e.currentTarget === e.target &&
          useUIState.setState(() => ({
            selectedBlocks: [],
          }));
      }}
      style={{ minHeight: `calc(${height}px + 32px)` }}
      className="relative h-full w-[1150px]"
    >
      <CanvasBackground />
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

const AddCanvasBlockButton = (props: {
  entityID: string;
  entity_set: { set: string };
}) => {
  let { rep } = useReplicache();
  return (
    <button
      className="absolute right-2 sm:top-4 sm:right-4 bottom-2 sm:bottom-auto z-10 p-0.5 rounded-full bg-bg-page border-2 outline outline-transparent hover:outline-1 hover:outline-accent-1 border-accent-1 text-accent-1"
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
      <AddBlockLarge />
    </button>
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
  let onDragEnd = useCallback(
    (dragPosition: { x: number; y: number }) => {
      console.log(dragPosition, rep);
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
    [props, rep],
  );
  let { onMouseDown, dragDelta } = useDrag({ onDragEnd });

  let widthOnDragEnd = useCallback(
    (dragPosition: { x: number; y: number }) => {
      console.log(dragPosition, rep);
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

  let { isLongPress, handlers } = useLongPress(
    () => {
      if (isLongPress.current) {
        focusBlock(
          {
            type: type?.data.value || "text",
            value: props.entityID,
            parent: props.parent,
          },
          { type: "start" },
        );
      }
    },
    () => {},
  );
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
  let transform = `translate(${x}px, ${y}px) rotate(${rotation + angle}deg)`;

  return (
    <div
      ref={ref}
      {...(!props.preview ? { ...handlers } : {})}
      id={props.preview ? undefined : elementId.block(props.entityID).container}
      className="absolute group/canvas-block will-change-transform rounded-lg flex items-stretch"
      style={{
        top: 0,
        left: 0,
        zIndex: dragDelta ? 10 : undefined,
        width: width + (widthHandle.dragDelta?.x || 0),
        transform,
      }}
    >
      {/* the gripper show on hover, but longpress logic needs to be added for mobile*/}
      {!props.preview && <Gripper onMouseDown={onMouseDown} />}
      <BaseBlock
        pageType="canvas"
        preview={props.preview}
        type={type?.data.value || "text"}
        value={props.entityID}
        factID={props.factID}
        position=""
        nextPosition=""
        entityID={props.entityID}
        parent={props.parent}
        nextBlock={null}
        previousBlock={null}
      />

      {!props.preview && (
        <div
          className={`resizeHandle
          cursor-e-resize shrink-0 z-10
          hidden group-hover/canvas-block:block
          w-[5px] h-6 -ml-[3px]
          absolute top-1/2 right-0 -translate-y-1/2 translate-x-[2px]
          rounded-full bg-white  border-2 border-[#8C8C8C] shadow-[0_0_0_1px_white,_inset_0_0_0_1px_white]`}
          onMouseDown={widthHandle.onMouseDown}
        />
      )}

      {!props.preview && (
        <div
          className={`resizeHandle
            cursor-grab shrink-0 z-10
            hidden group-hover/canvas-block:block
            w-[8px] h-[8px]
            absolute bottom-0 right-0
            -translate-y-1/2 -translate-x-1/2
            rounded-full bg-white  border-2 border-[#8C8C8C] shadow-[0_0_0_1px_white,_inset_0_0_0_1px_white]`}
          onMouseDown={rotateHandle.onMouseDown}
        />
      )}
    </div>
  );
}

const CanvasBackground = () => {
  return (
    <svg
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none text-border-light"
    >
      <defs>
        <pattern
          id="gridPattern"
          x="0"
          y="0"
          width="32"
          height="32"
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
      <rect width="100%" height="100%" x="0" y="0" fill="url(#gridPattern)" />
    </svg>
  );
};

const Gripper = (props: { onMouseDown: (e: React.MouseEvent) => void }) => {
  return (
    <div
      onMouseDown={props.onMouseDown}
      className="w-[9px] shrink-0 py-1 mr-1 bg-bg-card cursor-grab grid grid-cols-1 grid-rows-1"
    >
      <div
        className="h-full col-start-1 col-end-2 row-start-1 row-end-2 bg-bg-page hidden group-hover/canvas-block:block"
        style={{ maskImage: "var(--gripperSVG2)", maskRepeat: "space" }}
      />
      <div
        className="h-full col-start-1 col-end-2 row-start-1 row-end-2 bg-tertiary hidden group-hover/canvas-block:block"
        style={{ maskImage: "var(--gripperSVG)", maskRepeat: "space" }}
      />
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
