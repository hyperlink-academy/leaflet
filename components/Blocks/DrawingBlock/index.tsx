import { useMemo } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useIsBlockSelected } from "src/useUIState";
import { useEntitySetContext } from "components/EntitySetProvider";
import { EditTiny } from "components/Icons/EditTiny";
import { BlockLayout, type BlockProps } from "../Block";
import { InkSvg } from "./InkSvg";
import { useInkSession } from "./useInkSession";
import { startInk } from "./inkMutations";

export function DrawingBlock(props: BlockProps & { preview?: boolean }) {
  let strokeFacts = useEntity(props.entityID, "drawing/stroke");
  let viewBox = useEntity(props.entityID, "drawing/view-box")?.data.value;
  let erasing = useInkSession((s) =>
    s.target === props.entityID ? s.erasing : null,
  );
  let editing = useInkSession((s) => s.target === props.entityID);
  let isSelected = useIsBlockSelected(props.entityID);
  let { permissions } = useEntitySetContext();
  let { rep } = useReplicache();
  // Ink is drawn in canvas coordinates against the drawing's own canvas
  // block, which a drawing inside a group doesn't have.
  let canEdit =
    permissions.write && !props.preview && props.pageType === "canvas";

  // Fact ids are v7 uuids, so sorting them paints strokes in drawing order.
  let strokes = useMemo(
    () =>
      strokeFacts
        .filter((f) => !erasing?.includes(f.id))
        .sort((a, b) => (a.id < b.id ? -1 : 1))
        .map((f) => ({ id: f.id, stroke: f.data.value })),
    [strokeFacts, erasing],
  );
  if (!viewBox) return null;

  let edit = () => startInk(rep, props.parent, props.entityID);

  return (
    <BlockLayout
      isSelected={!!isSelected && !editing && !props.preview}
      // The ink is placed and scaled by the block's width, so the layout
      // adds no border or padding around it.
      className="p-0! border-0! overflow-visible!"
      extraOptions={
        canEdit && (
          <button
            aria-label="Edit drawing"
            title="Edit drawing"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              edit();
            }}
          >
            <EditTiny />
          </button>
        )
      }
    >
      <div
        className={`drawingBlock w-full rounded-md outline-2 outline-offset-4 ${editing ? "outline-dashed outline-border" : "outline-transparent"}`}
        onDoubleClick={canEdit ? edit : undefined}
      >
        <InkSvg viewBox={viewBox} strokes={strokes} />
      </div>
    </BlockLayout>
  );
}
