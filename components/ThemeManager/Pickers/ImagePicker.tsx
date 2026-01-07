import * as Slider from "@radix-ui/react-slider";
import { theme } from "../../../tailwind.config";

import { Color } from "react-aria-components";
import { Input } from "components/Input";
import { Radio } from "components/Checkbox";

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
      <div className="themeBGImageControls font-bold flex flex-col gap-1 items-center px-3">
        <label htmlFor="cover" className="w-full">
          <Radio
            radioCheckedClassName="text-[#595959]!"
            radioEmptyClassName="text-[#969696]!"
            type="radio"
            id="cover"
            name="bg-image-options"
            value="cover"
            checked={!repeat}
            onChange={async (e) => {
              if (!e.currentTarget.checked) return;
              if (!repeat) return;
              if (repeat) await rep?.mutate.retractFact({ factID: repeat.id });
            }}
          >
            <div
              className={`w-full cursor-pointer ${!repeat ? "text-[#595959]" : " text-[#969696]"}`}
            >
              cover
            </div>
          </Radio>
        </label>
        <label htmlFor="repeat" className="pb-3 w-full">
          <Radio
            type="radio"
            id="repeat"
            name="bg-image-options"
            value="repeat"
            radioCheckedClassName="text-[#595959]!"
            radioEmptyClassName="text-[#969696]!"
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
          >
            <div className="flex flex-col w-full">
              <div className="flex gap-2">
                <div
                  className={`shink-0 grow-0 w-fit z-10 cursor-pointer ${repeat ? "text-[#595959]" : " text-[#969696]"}`}
                >
                  repeat
                </div>
                <div
                  className={`flex font-normal ${repeat ? "text-[#969696]" : " text-[#C3C3C3]"}`}
                >
                  <Input
                    type="number"
                    className="w-10 text-right appearance-none bg-transparent"
                    max={3000}
                    min={10}
                    value={repeat ? repeat.data.value : 500}
                    onChange={(e) => {
                      rep?.mutate.assertFact({
                        entity: props.entityID,
                        attribute: props.card
                          ? "theme/card-background-image-repeat"
                          : "theme/background-image-repeat",
                        data: {
                          type: "number",
                          value: parseInt(e.currentTarget.value),
                        },
                      });
                    }}
                  />{" "}
                  px
                </div>
              </div>
              <Slider.Root
                className={`relative grow flex items-center select-none touch-none w-full h-fit px-1 `}
                value={[repeat ? repeat.data.value : 500]}
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
                <Slider.Track
                  className={`${repeat ? "bg-[#595959]" : " bg-[#C3C3C3]"} relative grow rounded-full h-[3px] my-2`}
                ></Slider.Track>
                <Slider.Thumb
                  className={`
                    flex w-4 h-4 rounded-full border-2 border-white cursor-pointer
                    ${repeat ? "bg-[#595959] shadow-[0_0_0_1px_#8C8C8C,inset_0_0_0_1px_#8C8C8C]" : " bg-[#C3C3C3] "}
                   `}
                  aria-label="Volume"
                />
              </Slider.Root>
            </div>
          </Radio>
        </label>
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
