"use client";

import { useEntity, useReplicache } from "src/replicache";
import { BlockProps } from "./Blocks";
import { useUIState } from "src/useUIState";

export function ImageBlock(props: BlockProps) {
  let rep = useReplicache();
  let image = useEntity(props.entityID, "block/image");
  console.log(image);
  if (image?.data.local && image.data.local !== rep.rep?.clientID)
    return (
      <div
        style={{
          height: image?.data.height,
          width: image?.data.width,
        }}
        className="flex content-center text-center"
      >
        loading
      </div>
    );

  return (
    <img
      onClick={() => useUIState.getState().setSelectedBlock(props.entityID)}
      alt={""}
      src={image?.data.src}
      height={image?.data.height}
      width={image?.data.width}
    />
  );
}
