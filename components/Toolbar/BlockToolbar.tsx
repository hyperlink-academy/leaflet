import { useEntity } from "src/replicache";
import { Separator } from "components/Layout";
import { useUIState } from "src/useUIState";
import { TextAlignmentButton } from "./TextAlignmentToolbar";
import {
  ImageFullBleedButton,
  ImageAltTextButton,
  ImageCoverButton,
} from "./ImageToolbar";

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
  let blockType = useEntity(
    focusedEntity?.entityType === "block" ? focusedEntity?.entityID : null,
    "block/type",
  )?.data.value;

  return (
    <div className="flex items-center gap-2 justify-between w-full">
      <div className="flex items-center gap-2">
        <TextAlignmentButton setToolbarState={props.setToolbarState} />
        <ImageFullBleedButton />
        <ImageAltTextButton />
        <ImageCoverButton />
        {focusedEntityType?.data.value !== "canvas" && (
          <Separator classname="h-6!" />
        )}
      </div>
    </div>
  );
};
