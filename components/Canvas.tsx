import { useEntity, useReplicache } from "src/replicache";
import { useEntitySetContext } from "./EntitySetProvider";
import { v7 } from "uuid";
import { Block } from "./Blocks/Block";
import { useEffect, useState } from "react";

export function Canvas(props: { entityID: string }) {
  let blocks = useEntity(props.entityID, "canvas/block");
  let { rep } = useReplicache();
  let entity_set = useEntitySetContext();
  return (
    <div className="relative">
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
      {blocks.map((b) => {
        return (
          <CanvasBlock
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
        type={type?.data.value || "text"}
        value={props.entityID}
        factID={props.factID}
        position=""
        nextPosition=""
        entityID={props.entityID}
        parent={props.entityID}
        nextBlock={null}
        previousBlock={null}
      />
    </div>
  );
}
