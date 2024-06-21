"use client";

import { useEntity, useReplicache } from "src/replicache";
import { BlockProps } from "./Blocks";
import { useUIState } from "src/useUIState";
import { theme } from "tailwind.config";
import { CloseContrastSmall } from "./Icons";
import useMeasure from "react-use-measure";

export function ImageBlock(props: BlockProps) {
  let { rep } = useReplicache();
  let [ref, { width }] = useMeasure();
  let image = useEntity(props.entityID, "block/image");
  let imageHeight = image?.data.height;
  let imageWidth = image?.data.width;
  console.log(imageWidth && width < imageWidth);
  if (image?.data.local && image.data.local !== rep?.clientID)
    return (
      <div
        ref={ref}
        style={{
          height:
            imageWidth && imageHeight && width < imageWidth
              ? imageHeight * (width / imageWidth)
              : imageHeight,
          width: image?.data.width,
        }}
        className="flex place-items-center justify-center bg-border-light italic text-tertiary rounded-md min-w-full max-w-full"
      >
        loading...
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
