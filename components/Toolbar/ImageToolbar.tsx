"use client";
import { useEntity } from "src/replicache";
import { useUIState } from "src/useUIState";
import { Separator } from "components/Layout";
import { TextAlignmentButton } from "./TextAlignmentToolbar";

export const ImageToolbar = (props: {
  setToolbarState: (state: "image" | "text-alignment") => void;
}) => {
  let focusedEntity = useUIState((s) => s.focusedEntity);
  let focusedEntityType = useEntity(
    focusedEntity?.entityType === "page"
      ? focusedEntity.entityID
      : focusedEntity?.parent || null,
    "page/type",
  );

  return (
    <div className="flex items-center gap-2 justify-between w-full">
      <div className="flex items-center gap-2">
        <TextAlignmentButton setToolbarState={props.setToolbarState} />
        {focusedEntityType?.data.value !== "canvas" && (
          <Separator classname="h-6!" />
        )}
      </div>
    </div>
  );
};
