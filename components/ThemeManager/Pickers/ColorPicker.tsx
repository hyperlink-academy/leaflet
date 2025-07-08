"use client";

import {
  ColorPicker as SpectrumColorPicker,
  parseColor,
  Color,
  ColorArea,
  ColorThumb,
  ColorSlider,
  Input,
  ColorField,
  SliderTrack,
  ColorSwatch,
} from "react-aria-components";
import { pickers } from "../ThemeSetter";
import { Separator } from "components/Layout";
import { onMouseDown } from "src/utils/iosInputMouseDown";

export let thumbStyle =
  "w-4 h-4 rounded-full border-2 border-white shadow-[0_0_0_1px_#8C8C8C,_inset_0_0_0_1px_#8C8C8C]";

export const ColorPicker = (props: {
  label?: string;
  value: Color | undefined;
  alpha?: boolean;
  image?: boolean;
  setValue: (c: Color) => void;
  openPicker: pickers;
  thisPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
  closePicker: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) => {
  return (
    <SpectrumColorPicker value={props.value} onChange={props.setValue}>
      <div className="flex flex-col w-full gap-2">
        <div className="colorPickerLabel flex gap-2 items-center ">
          <button
            disabled={props.disabled}
            className="flex gap-2 items-center disabled:text-tertiary"
            onClick={() => {
              if (props.openPicker === props.thisPicker) {
                props.setOpenPicker("null");
              } else {
                props.setOpenPicker(props.thisPicker);
              }
            }}
          >
            <ColorSwatch
              color={props.value}
              className={`w-6 h-6 rounded-full border-2 border-white shadow-[0_0_0_1px_#8C8C8C] ${props.disabled ? "opacity-50" : ""}`}
              style={{
                backgroundSize: "cover",
              }}
            />
            <strong className="w-max">{props.label}</strong>
          </button>

          <div className="flex gap-1">
            {props.value === undefined ? (
              <div>default</div>
            ) : props.disabled ? (
              <div className="text-tertiary italic">hidden</div>
            ) : (
              <ColorField className="w-fit gap-1">
                <Input
                  onMouseDown={onMouseDown}
                  onFocus={(e) => {
                    e.currentTarget.setSelectionRange(
                      1,
                      e.currentTarget.value.length,
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    } else return;
                  }}
                  onBlur={(e) => {
                    props.setValue(parseColor(e.currentTarget.value));
                  }}
                  className="w-[72px] bg-transparent outline-none disabled:text-tertiary"
                />
              </ColorField>
            )}
            {props.alpha && !props.disabled && (
              <>
                <Separator classname="my-1" />
                <ColorField
                  className={`w-fit pl-[6px] ${props.disabled ? "opacity-50" : ""}`}
                  channel="alpha"
                >
                  <Input
                    disabled={props.disabled}
                    onMouseDown={onMouseDown}
                    onFocus={(e) => {
                      e.currentTarget.setSelectionRange(
                        0,
                        e.currentTarget.value.length - 1,
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      } else return;
                    }}
                    className="w-[72px] bg-transparent outline-none "
                  />
                </ColorField>
              </>
            )}
          </div>
        </div>
        {props.openPicker === props.thisPicker && (
          <div className="w-full flex flex-col gap-2 px-1 pb-2">
            {
              <>
                <ColorArea
                  className="w-full h-[128px] rounded-md"
                  colorSpace="hsb"
                  xChannel="saturation"
                  yChannel="brightness"
                >
                  <ColorThumb className={thumbStyle} />
                </ColorArea>
                <ColorSlider colorSpace="hsb" className="w-full" channel="hue">
                  <SliderTrack className="h-2 w-full rounded-md">
                    <ColorThumb className={`${thumbStyle} mt-[4px]`} />
                  </SliderTrack>
                </ColorSlider>
                {props.alpha && (
                  <ColorSlider
                    colorSpace="hsb"
                    className="w-full mt-1 rounded-full"
                    style={{
                      backgroundImage: `url(./transparent-bg.png)`,
                      backgroundRepeat: "repeat",
                      backgroundSize: "8px",
                    }}
                    channel="alpha"
                  >
                    <SliderTrack className="h-2 w-full rounded-md">
                      <ColorThumb className={`${thumbStyle} mt-[4px]`} />
                    </SliderTrack>
                  </ColorSlider>
                )}
                {props.children}
              </>
            }
          </div>
        )}
      </div>
    </SpectrumColorPicker>
  );
};
