import * as Slider from "@radix-ui/react-slider";
import { Input } from "components/Input";
import { useEntity, useReplicache } from "src/replicache";
import { pickers } from "../ThemeSetter";
import { useState } from "react";

export const PageWidthSetter = (props: {
  entityID: string;
  openPicker: pickers;
  thisPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
  closePicker: () => void;
}) => {
  let { rep } = useReplicache();
  let pageWidth = useEntity(props.entityID, "theme/page-width");
  let currentValue = pageWidth?.data.value || 624;
  let [interimValue, setInterimValue] = useState<number>(currentValue);
  let min = 324;
  let max = 1200;

  let open = props.openPicker == props.thisPicker;

  return (
    <div className="pageWidthSetter flex flex-col gap-2 px-2 py-[6px] border border-[#CCCCCC] rounded-md">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <button
            className="font-bold text-[#000000] shrink-0 grow-0 w-fit"
            onClick={() => {
              if (props.openPicker === props.thisPicker) {
                props.setOpenPicker("null");
              } else {
                props.setOpenPicker(props.thisPicker);
              }
            }}
          >
            Max Page Width
          </button>
          <div className="flex font-normal text-[#969696]">
            <Input
              type="number"
              className="relative w-10 text-right appearance-none bg-transparent"
              max={max}
              min={min}
              value={interimValue}
              onFocus={(e) => {
                e.preventDefault();
                props.setOpenPicker(props.thisPicker);
              }}
              onChange={(e) => {
                setInterimValue(parseInt(e.currentTarget.value));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  e.preventDefault();
                  let clampedValue = interimValue;
                  if (!isNaN(interimValue)) {
                    clampedValue = Math.max(min, Math.min(max, interimValue));
                    setInterimValue(clampedValue);
                  }
                  rep?.mutate.assertFact({
                    entity: props.entityID,
                    attribute: "theme/page-width",
                    data: {
                      type: "number",
                      value: clampedValue,
                    },
                  });
                }
              }}
              onBlur={() => {
                let clampedValue = interimValue;
                if (!isNaN(interimValue)) {
                  clampedValue = Math.max(min, Math.min(max, interimValue));
                  setInterimValue(clampedValue);
                }
                rep?.mutate.assertFact({
                  entity: props.entityID,
                  attribute: "theme/page-width",
                  data: {
                    type: "number",
                    value: clampedValue,
                  },
                });
              }}
            />
            px
          </div>
        </div>
        {open && (
          <Slider.Root
            className="relative grow flex items-center select-none touch-none w-full h-fit px-1 mb-1"
            value={[interimValue]}
            max={max}
            min={min}
            step={16}
            onValueChange={(value) => {
              setInterimValue(value[0]);
            }}
            onPointerUp={() => {
              rep?.mutate.assertFact({
                entity: props.entityID,
                attribute: "theme/page-width",
                data: { type: "number", value: interimValue },
              });
            }}
          >
            <Slider.Track className="bg-[#595959] relative grow rounded-full h-[3px]" />
            <Slider.Thumb
              className="flex w-4 h-4 outline-none!  rounded-full border-2 border-white cursor-pointer bg-[#595959]
            focus:shadow-[0_0_0_1px_#8C8C8C,inset_0_0_0_1px_#8C8C8C]
              "
              aria-label="Max Page Width"
            />
          </Slider.Root>
        )}
      </div>
    </div>
  );
};
