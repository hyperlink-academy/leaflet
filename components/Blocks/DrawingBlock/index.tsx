import { useMemo } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useIsBlockSelected } from "src/useUIState";
import { useEntitySetContext } from "components/EntitySetProvider";
import { DrawSmall } from "components/Icons/DrawSmall";
import type { BlockProps } from "../Block";
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
  let canEdit = permissions.write && !props.preview;

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
    <div
      className={`drawingBlock relative w-full rounded-md outline-2 outline-offset-4 ${isSelected && !editing ? "outline-accent-contrast" : editing ? "outline-dashed outline-border" : "outline-transparent"}`}
      onDoubleClick={canEdit ? edit : undefined}
    >
      <InkSvg viewBox={viewBox} strokes={strokes} />
      {canEdit && isSelected && !editing && (
        <button
          aria-label="Edit drawing"
          title="Edit drawing"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={edit}
          className="absolute -top-3 -right-3 p-1 rounded-full bg-bg-page border border-border text-secondary hover:text-accent-contrast"
        >
          <DrawSmall width={16} height={16} />
        </button>
      )}
    </div>
  );
}
