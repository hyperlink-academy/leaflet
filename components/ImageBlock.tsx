"use client";

import { useEntity, useReplicache } from "src/replicache";
import { BlockProps } from "./Blocks";
import { useUIState } from "src/useUIState";
import { theme } from "tailwind.config";
import { CloseContrastSmall } from "./Icons";
import useMeasure from "react-use-measure";
import { useEntitySetContext } from "./EntitySetProvider";

export function ImageBlock(props: BlockProps) {
  let { rep, permission_token } = useReplicache();
  let entity_set = useEntitySetContext();

  let permission = useEntitySetContext().permissions.write;

  let image = useEntity(props.entityID, "block/image");
  if (image?.data.local && image.data.local !== rep?.clientID)
    return (
      <div className="flex place-items-center justify-center bg-border italic text-tertiary rounded-md min-w-full max-w-full">
        <img
          alt={""}
          src={image?.data.fallback}
          height={image?.data.height}
          width={image?.data.width}
          className=""
        />
      </div>
    );

  return (
    <div className="relative group/image flex w-full justify-center">
      {permission && (
        <button
          className="absolute right-2 top-2 z-10 hidden group-hover/image:block"
          onClick={() => {
            rep?.mutate.removeBlock({ blockEntity: props.entityID });
          }}
        >
          <CloseContrastSmall
            fill={theme.colors.primary}
            stroke={theme.colors["bg-card"]}
          />
        </button>
      )}
      <img
        onClick={() => useUIState.getState().setSelectedBlock(props)}
        alt={""}
        src={image?.data.src}
        height={image?.data.height}
        width={image?.data.width}
        className=""
      />
    </div>
  );
}
