"use client";

import { useEntity, useReplicache } from "src/replicache";
import { BlockProps } from "components/Blocks";
import { useUIState } from "src/useUIState";

import { useEntitySetContext } from "components/EntitySetProvider";

export function ImageBlock(props: BlockProps) {
  let { rep, permission_token } = useReplicache();
  let entity_set = useEntitySetContext();

  let permission = useEntitySetContext().permissions.write;
  let image = useEntity(props.entityID, "block/image");
  let selected = useUIState(
    (s) =>
      (props.type !== "text" || s.selectedBlock.length > 1) &&
      s.selectedBlock.find((b) => b.value === props.entityID),
  );

  return (
    <div className="relative group/image flex w-full justify-center">
      <img
        alt={""}
        src={
          image?.data.local && image.data.local !== rep?.clientID
            ? image?.data.fallback
            : image?.data.src
        }
        height={image?.data.height}
        width={image?.data.width}
        className={`
          outline outline-1 border rounded-lg
          ${selected ? "border-tertiary outline-tertiary" : "border-transparent  outline-transparent"}`}
      />
    </div>
  );
}
