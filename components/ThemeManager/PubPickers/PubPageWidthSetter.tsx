import * as Slider from "@radix-ui/react-slider";
import { Input } from "components/Input";
import { Radio } from "components/Checkbox";
import { useState, useEffect } from "react";
import { pickers } from "../ThemeSetter";

export const PubPageWidthSetter = (props: {
  pageWidth: number | undefined;
  setPageWidth: (value: number) => void;
  thisPicker: pickers;
  openPicker: pickers;
  setOpenPicker: (p: pickers) => void;
}) => {
  let defaultPreset = 624;
  let widePreset = 768;

  let currentValue = props.pageWidth || defaultPreset;
  let [interimValue, setInterimValue] = useState<number>(currentValue);
  let [selectedPreset, setSelectedPreset] = useState<
    "default" | "wide" | "custom"
  >(
    currentValue === defaultPreset
      ? "default"
      : currentValue === widePreset
        ? "wide"
        : "custom",
  );
  let min = 320;
  let max = 1200;

  // Update interim value when current value changes
  useEffect(() => {
    setInterimValue(currentValue);
  }, [currentValue]);

  const setPageWidth = (value: number) => {
    props.setPageWidth(value);
  };

  let open = props.openPicker == props.thisPicker;

  return (
    <div className="pageWidthSetter flex flex-col gap-2 px-2 py-[6px] border border-[#CCCCCC] rounded-md bg-white">
      <button
        type="button"
        className="font-bold text-[#000000] shrink-0 grow-0 w-full flex gap-2 text-left items-center"
        onClick={() => {
          if (!open) {
            props.setOpenPicker(props.thisPicker);
          } else {
            props.setOpenPicker("null");
          }
        }}
      >
        Max Page Width
        <div className="flex font-normal text-[#969696]">{currentValue}px</div>
      </button>

      {open && (
        <div className="flex flex-col gap-1 px-3">
          <label htmlFor="pub-default" className="w-full">
            <Radio
              radioCheckedClassName="text-[#595959]!"
              radioEmptyClassName="text-[#969696]!"
              type="radio"
              id="pub-default"
              name="pub-page-width-options"
              value="default"
              checked={selectedPreset === "default"}
              onChange={(e) => {
                if (!e.currentTarget.checked) return;
                setSelectedPreset("default");
                setPageWidth(defaultPreset);
              }}
            >
              <div
                className={`w-full cursor-pointer ${selectedPreset === "default" ? "text-[#595959]" : "text-[#969696]"}`}
              >
                default (624px)
              </div>
            </Radio>
          </label>
          <label htmlFor="pub-wide" className="w-full">
            <Radio
              radioCheckedClassName="text-[#595959]!"
              radioEmptyClassName="text-[#969696]!"
              type="radio"
              id="pub-wide"
              name="pub-page-width-options"
              value="wide"
              checked={selectedPreset === "wide"}
              onChange={(e) => {
                if (!e.currentTarget.checked) return;
                setSelectedPreset("wide");
                setPageWidth(widePreset);
              }}
            >
              <div
                className={`w-full cursor-pointer ${selectedPreset === "wide" ? "text-[#595959]" : "text-[#969696]"}`}
              >
                wide (756px)
              </div>
            </Radio>
          </label>
          <label htmlFor="pub-custom" className="pb-3 w-full">
            <Radio
              type="radio"
              id="pub-custom"
              name="pub-page-width-options"
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
              <div className="flex flex-col w-full">
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
                    className={`${selectedPreset === "custom" ? "bg-[#595959]" : "bg-[#C3C3C3]"} relative grow rounded-full h-[3px] my-2`}
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
  );
};
