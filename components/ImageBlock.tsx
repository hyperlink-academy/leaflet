"use client";

import { useEntity, useReplicache } from "src/replicache";
import { BlockProps } from "./Blocks";
import { useUIState } from "src/useUIState";
import { theme } from "tailwind.config";
import { CloseContrastSmall } from "./Icons";

export function ImageBlock(props: BlockProps) {
  let { rep } = useReplicache();
  let image = useEntity(props.entityID, "block/image");

  if (image?.data.local && image.data.local !== rep?.clientID)
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
    <div className="relative group/image flex w-full justify-center">
      <button
        className="absolute right-2 top-2 z-10 hidden group-hover/image:block"
        onClick={() => {
          rep?.mutate.removeBlock({ blockEntity: props.entityID });
        }}
      >
        <CloseContrastSmall
          fill={theme.colors.primary}
          outline={theme.colors["bg-card"]}
        />
      </button>
      <img
        onClick={() => useUIState.getState().setSelectedBlock(props.entityID)}
        alt={""}
        src={image?.data.src}
        height={image?.data.height}
        width={image?.data.width}
        className=""
      />
    </div>
  );
}
