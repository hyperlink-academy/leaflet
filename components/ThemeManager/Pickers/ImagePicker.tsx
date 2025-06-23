import * as Slider from "@radix-ui/react-slider";
import { theme } from "../../../tailwind.config";

import { Color } from "react-aria-components";

import { useEntity, useReplicache } from "src/replicache";
import { addImage } from "src/utils/addImage";
import { BlockImageSmall } from "components/Icons/BlockImageSmall";
import { CloseContrastSmall } from "components/Icons/CloseContrastSmall";

export const ImageSettings = (props: {
  entityID: string;
  card?: boolean;
  setValue: (c: Color) => void;
}) => {
  let image = useEntity(
    props.entityID,
    props.card ? "theme/card-background-image" : "theme/background-image",
  );
  let repeat = useEntity(
    props.entityID,
    props.card
      ? "theme/card-background-image-repeat"
      : "theme/background-image-repeat",
  );
  let pageType = useEntity(props.entityID, "page/type")?.data.value;
  let { rep } = useReplicache();
  return (
    <>
      <div
        style={{
          backgroundImage: image?.data.src
            ? `url(${image.data.src})`
            : undefined,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
        className="themeBGImagePreview flex gap-2 place-items-center justify-center w-full h-[128px]  bg-cover bg-center bg-no-repeat"
      >
        <label className="hover:cursor-pointer ">
          <div
            className="flex gap-2 rounded-md px-2 py-1 text-accent-contrast font-bold"
            style={{ backgroundColor: "rgba(var(--bg-page), .8" }}
          >
            <BlockImageSmall /> Change Image
          </div>
          <div className="hidden">
            <ImageInput {...props} />
          </div>
        </label>
        <button
          onClick={() => {
            if (image) rep?.mutate.retractFact({ factID: image.id });
            if (repeat) rep?.mutate.retractFact({ factID: repeat.id });
          }}
        >
          <CloseContrastSmall
            fill={theme.colors["accent-1"]}
            stroke={theme.colors["accent-2"]}
          />
        </button>
      </div>
      <div className="themeBGImageControls font-bold flex gap-2 items-center">
        {pageType !== "canvas" && (
          <label htmlFor="cover" className="flex shrink-0">
            <input
              className="appearance-none"
              type="radio"
              id="cover"
              name="bg-image-options"
              value="cover"
              checked={!repeat}
              onChange={async (e) => {
                if (!e.currentTarget.checked) return;
                if (!repeat) return;
                if (repeat)
                  await rep?.mutate.retractFact({ factID: repeat.id });
              }}
            />
            <div
              className={`shink-0 grow-0 w-fit border border-accent-1 rounded-md px-1 py-0.5 cursor-pointer ${!repeat ? "bg-accent-1 text-accent-2" : "bg-transparent text-accent-1"}`}
            >
              cover
            </div>
          </label>
        )}
        <label htmlFor="repeat" className="flex shrink-0">
          <input
            className={`appearance-none `}
            type="radio"
            id="repeat"
            name="bg-image-options"
            value="repeat"
            checked={!!repeat}
            onChange={async (e) => {
              if (!e.currentTarget.checked) return;
              if (repeat) return;
              await rep?.mutate.assertFact({
                entity: props.entityID,
                attribute: props.card
                  ? "theme/card-background-image-repeat"
                  : "theme/background-image-repeat",
                data: { type: "number", value: 500 },
              });
            }}
          />
          <div
            className={`shink-0 grow-0 w-fit z-10 border border-accent-1 rounded-md px-1 py-0.5 cursor-pointer ${repeat ? "bg-accent-1 text-accent-2" : "bg-transparent text-accent-1"}`}
          >
            repeat
          </div>
        </label>
        {(repeat || pageType === "canvas") && (
          <Slider.Root
            className="relative grow flex items-center select-none touch-none w-full h-fit"
            value={[repeat?.data.value || 500]}
            max={3000}
            min={10}
            step={10}
            onValueChange={(value) => {
              rep?.mutate.assertFact({
                entity: props.entityID,
                attribute: props.card
                  ? "theme/card-background-image-repeat"
                  : "theme/background-image-repeat",
                data: { type: "number", value: value[0] },
              });
            }}
          >
            <Slider.Track className="bg-accent-1 relative grow rounded-full h-[3px]"></Slider.Track>
            <Slider.Thumb
              className="flex w-4 h-4 rounded-full border-2 border-white bg-accent-1 shadow-[0_0_0_1px_#8C8C8C,_inset_0_0_0_1px_#8C8C8C] cursor-pointer"
              aria-label="Volume"
            />
          </Slider.Root>
        )}
      </div>
    </>
  );
};

export const ImageInput = (props: {
  entityID: string;
  onChange?: () => void;
  card?: boolean;
}) => {
  let pageType = useEntity(props.entityID, "page/type")?.data.value;
  let { rep } = useReplicache();
  return (
    <input
      type="file"
      accept="image/*"
      onChange={async (e) => {
        let file = e.currentTarget.files?.[0];
        if (!file || !rep) return;

        await addImage(file, rep, {
          entityID: props.entityID,
          attribute: props.card
            ? "theme/card-background-image"
            : "theme/background-image",
        });
        props.onChange?.();

        if (pageType === "canvas") {
          rep &&
            rep.mutate.assertFact({
              entity: props.entityID,
              attribute: "canvas/background-pattern",
              data: { type: "canvas-pattern-union", value: "plain" },
            });
        }
      }}
    />
  );
};
