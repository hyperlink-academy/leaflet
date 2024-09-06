import { useEntity, useReplicache } from "src/replicache";
import { useEntitySetContext } from "./EntitySetProvider";
import { v7 } from "uuid";
import { Block } from "./Blocks/Block";
import { useEffect, useState } from "react";

export function Canvas(props: { entityID: string; preview?: boolean }) {
  return (
    <div
      onTouchMoveCapture={(e) => {
        e.preventDefault();
      }}
      onWheelCapture={(e) => {
        e.preventDefault();
        e.currentTarget.scrollLeft += e.deltaX;
        e.currentTarget.scrollTop += e.deltaY;
      }}
      className={`
        h-full
  canvasWrapper relative mx-auto
  w-fit
  max-w-[calc(100vw-12px)] sm:max-w-[calc(100vw-128px)] lg:max-w-[1152px]
  bg-white rounded-lg border border-[#DBDBDB]
  overflow-y-scroll no-scrollbar
`}
    >
      <CanvasContent {...props} />
    </div>
  );
}

export function CanvasContent(props: { entityID: string; preview?: boolean }) {
  let blocks = useEntity(props.entityID, "canvas/block");
  let { rep } = useReplicache();
  let entity_set = useEntitySetContext();
  let [height, setHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    setHeight(document.getElementById("canvasContent")?.scrollHeight);
  }, [blocks]);
  return (
    <div
      id="canvasContent"
      style={{ height: `calc(${height}px + 32px)` }}
      className="relative h-full w-[1150px]"
    >
      <button
        onMouseDown={() => {
          rep?.mutate.addCanvasBlock({
            parent: props.entityID,
            position: {
              x: Math.floor(Math.random() * 191) + 10,
              y: Math.floor(Math.random() * 191) + 10,
            },
            factID: v7(),
            type: "text",
            newEntityID: v7(),
            permission_set: entity_set.set,
          });
        }}
      >
        add block
      </button>
      <CanvasBackground color="#DBDBDB" />
      {blocks.map((b) => {
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

function CanvasBlock(props: {
  preview?: boolean;
  entityID: string;
  parent: string;
  position: { x: number; y: number };
  factID: string;
}) {
  let width = useEntity(props.entityID, "canvas/block/width");
  let type = useEntity(props.entityID, "block/type");
  let [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  let { rep } = useReplicache();
  let [dragPosition, setDragPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  useEffect(() => {
    if (!dragStart || !rep) return;
    let disconnect = new AbortController();
    let dragPosition = { x: 0, y: 0 };
    window.addEventListener(
      "mousemove",
      (e) => {
        dragPosition = {
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        };
        setDragPosition(dragPosition);
      },
      { signal: disconnect.signal },
    );
    window.addEventListener(
      "mouseup",
      () => {
        setDragStart(null);
        setDragPosition(null);
        rep.mutate.assertFact({
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
      { signal: disconnect.signal },
    );
    return () => {
      disconnect.abort();
    };
  }, [dragStart, rep, props]);
  return (
    <div
      onMouseDown={(e) => setDragStart({ x: e.clientX, y: e.clientY })}
      className="absolute border will-change-transform"
      style={{
        width: props.width || 260,
        transform: dragPosition
          ? `translate(${dragPosition.x}px, ${dragPosition.y}px)`
          : undefined,
        top: props.position.y,
        left: props.position.x,
      }}
    >
      <Block
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
    </div>
  );
}

const CanvasBackground = (props: { color: string }) => {
  return (
    <svg
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none"
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
            fill={props.color}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" x="0" y="0" fill="url(#gridPattern)" />
    </svg>
  );
};
