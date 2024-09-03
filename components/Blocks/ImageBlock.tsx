"use client";

import { useEntity, useReplicache } from "src/replicache";
import { Block } from "./Block";
import { useUIState } from "src/useUIState";

export function ImageBlock(props: Block) {
  let { rep } = useReplicache();
  let image = useEntity(props.value, "block/image");
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.value),
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
          ${isSelected ? "border-tertiary outline-tertiary" : "border-transparent  outline-transparent"}`}
      />
    </div>
  );
}
