import * as Slider from "@radix-ui/react-slider";
import { Input } from "components/Input";
import { Radio } from "components/Checkbox";
import { useEntity, useReplicache } from "src/replicache";
import { pickers } from "../ThemeSetter";
import { useState, useEffect } from "react";

export const PageWidthSetter = (props: {
  entityID: string;
  openPicker: pickers;
  thisPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
  closePicker: () => void;
}) => {
  let { rep } = useReplicache();
  let pageWidth = useEntity(props.entityID, "theme/page-width")?.data.value;
  let currentValue = pageWidth || 624;
  let [interimValue, setInterimValue] = useState<number>(currentValue);
  let [selectedPreset, setSelectedPreset] = useState<
    "default" | "wide" | "custom"
  >(
    currentValue === 624 ? "default" : currentValue === 756 ? "wide" : "custom",
  );
  let min = 324;
  let max = 1200;

  let open = props.openPicker == props.thisPicker;

  // Update interim value when current value changes
  useEffect(() => {
    setInterimValue(currentValue);
  }, [currentValue]);

  const setPageWidth = (value: number) => {
    rep?.mutate.assertFact({
      entity: props.entityID,
      attribute: "theme/page-width",
      data: {
        type: "number",
        value: value,
      },
    });
  };

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
            {currentValue}px
          </div>
        </div>
        {open && (
          <div className="flex flex-col gap-1 px-3">
            <label htmlFor="default" className="w-full">
              <Radio
                radioCheckedClassName="text-[#595959]!"
                radioEmptyClassName="text-[#969696]!"
                type="radio"
                id="default"
                name="page-width-options"
                value="default"
                checked={selectedPreset === "default"}
                onChange={(e) => {
                  if (!e.currentTarget.checked) return;
                  setSelectedPreset("default");
                  setPageWidth(624);
                }}
              >
                <div
                  className={`w-full cursor-pointer ${selectedPreset === "default" ? "text-[#595959]" : "text-[#969696]"}`}
                >
                  default (624px)
                </div>
              </Radio>
            </label>
            <label htmlFor="wide" className="w-full">
              <Radio
                radioCheckedClassName="text-[#595959]!"
                radioEmptyClassName="text-[#969696]!"
                type="radio"
                id="wide"
                name="page-width-options"
                value="wide"
                checked={selectedPreset === "wide"}
                onChange={(e) => {
                  if (!e.currentTarget.checked) return;
                  setSelectedPreset("wide");
                  setPageWidth(756);
                }}
              >
                <div
                  className={`w-full cursor-pointer ${selectedPreset === "wide" ? "text-[#595959]" : "text-[#969696]"}`}
                >
                  wide (756px)
                </div>
              </Radio>
            </label>
            <label htmlFor="custom" className="pb-3 w-full">
              <Radio
                type="radio"
                id="custom"
                name="page-width-options"
                value="custom"
                radioCheckedClassName="text-[#595959]!"
                radioEmptyClassName="text-[#969696]!"
                checked={selectedPreset === "custom"}
                onChange={(e) => {
                  if (!e.currentTarget.checked) return;
                  setSelectedPreset("custom");
                  if (selectedPreset !== "custom") {
                    setPageWidth(currentValue);
                    setInterimValue(currentValue);
                  }
                }}
              >
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex gap-2">
                    <div
                      className={`shrink-0 grow-0 w-fit z-10 cursor-pointer ${selectedPreset === "custom" ? "text-[#595959]" : "text-[#969696]"}`}
                    >
                      custom
                    </div>
                    <div
                      className={`flex font-normal ${selectedPreset === "custom" ? "text-[#969696]" : "text-[#C3C3C3]"}`}
                    >
                      <Input
                        type="number"
                        className="w-10 text-right appearance-none bg-transparent"
                        max={max}
                        min={min}
                        value={interimValue}
                        onChange={(e) => {
                          setInterimValue(parseInt(e.currentTarget.value));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "Escape") {
                            e.preventDefault();
                            let clampedValue = interimValue;
                            if (!isNaN(interimValue)) {
                              clampedValue = Math.max(
                                min,
                                Math.min(max, interimValue),
                              );
                              setInterimValue(clampedValue);
                            }
                            setPageWidth(clampedValue);
                          }
                        }}
                        onBlur={() => {
                          let clampedValue = interimValue;
                          if (!isNaN(interimValue)) {
                            clampedValue = Math.max(
                              min,
                              Math.min(max, interimValue),
                            );
                            setInterimValue(clampedValue);
                          }
                          setPageWidth(clampedValue);
                        }}
                      />
                      px
                    </div>
                  </div>
                  <Slider.Root
                    className={`relative grow flex items-center select-none touch-none w-full h-fit px-1`}
                    value={[interimValue]}
                    max={max}
                    min={min}
                    step={16}
                    onValueChange={(value) => {
                      setInterimValue(value[0]);
                    }}
                    onValueCommit={(value) => {
                      setPageWidth(value[0]);
                    }}
                  >
                    <Slider.Track
                      className={`${selectedPreset === "custom" ? "bg-[#595959]" : "bg-[#C3C3C3]"} relative grow rounded-full h-[3px]`}
                    />
                    <Slider.Thumb
                      className={`flex w-4 h-4 rounded-full border-2 border-white cursor-pointer
                        ${selectedPreset === "custom" ? "bg-[#595959] shadow-[0_0_0_1px_#8C8C8C,inset_0_0_0_1px_#8C8C8C]" : "bg-[#C3C3C3]"}
                      `}
                      aria-label="Max Page Width"
                    />
                  </Slider.Root>
                </div>
              </Radio>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
