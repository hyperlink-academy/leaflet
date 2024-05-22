import * as Popover from "@radix-ui/react-popover";
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
} from "react-aria-components";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Provider, defaultTheme } from "@adobe/react-spectrum";
import { imageArgs } from "./page";

function setCSSVariableToColor(name: string, value: Color) {
  let root = document.querySelector(":root") as HTMLElement;
  root?.style.setProperty(name, value.toString("hsl"));
}

export const ThemePopover = (props: {
  pageBGImage: imageArgs;
  setPageBGImage: (imageArgs: Partial<imageArgs>) => void;
}) => {
  let [pageValue, setPageValue] = useState(parseColor("hsl(198, 100%, 96%)"));
  let [cardValue, setCardValue] = useState(parseColor("hsl(0, 100%, 100%)"));
  let [textValue, setTextValue] = useState(parseColor("hsl(0, 100%, 15%)"));
  let [accentValue, setAccentValue] = useState(
    parseColor("hsl(240, 100%, 50%)"),
  );
  let [accentTextValue, setAccentTextValue] = useState(
    parseColor("hsl(1, 100%, 100%)"),
  );

  useEffect(() => {
    setCSSVariableToColor("--bg-page", pageValue);
    setCSSVariableToColor("--bg-card", cardValue);
    setCSSVariableToColor("--primary", textValue);
    setCSSVariableToColor("--accent", accentValue);
    setCSSVariableToColor("--accent-text", accentTextValue);
  }, [pageValue, cardValue, textValue, accentValue, accentTextValue]);

  return (
    <Popover.Root>
      <Popover.Trigger>
        {" "}
        <div className="rounded-full w-6 h-6 border" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="w-64 py-2 px-3 bg-bg-page rounded-md border border-border flex flex-col gap-4"
          align="center"
          sideOffset={4}
          collisionPadding={16}
        >
          <ColorPicker
            value={pageValue}
            setValue={setPageValue}
            label="page bg"
          />
          <div className="flex flex-col gap-1">
            <strong>bg image</strong>
            <input
              type="text"
              id="url"
              name="url"
              value={props.pageBGImage.url}
              onChange={(e) => {
                props.setPageBGImage({
                  url: e.currentTarget.value,
                });
              }}
            />
            <input
              type="number"
              id="size"
              name="size"
              value={props.pageBGImage.size}
              min="100"
              onChange={(e) => {
                props.setPageBGImage({
                  size: e.currentTarget.valueAsNumber,
                });
              }}
            />

            <div className="flex gap-2">
              <label htmlFor="repeat">
                <input
                  type="radio"
                  id="repeat"
                  name="repeat"
                  value="repeat"
                  checked={props.pageBGImage.repeat === true}
                  onChange={() => {
                    props.setPageBGImage({
                      repeat: true,
                    });
                  }}
                />
                repeat
              </label>
              <label htmlFor="cover">
                <input
                  type="radio"
                  id="no-repeat"
                  name="repeat"
                  value="no-repeat"
                  checked={props.pageBGImage.repeat === false}
                  onChange={() => {
                    props.setPageBGImage({
                      repeat: false,
                    });
                  }}
                />
                cover
              </label>
            </div>
          </div>

          <ColorPicker
            value={cardValue}
            setValue={setCardValue}
            label="card bg"
          />

          <ColorPicker
            value={textValue}
            setValue={setTextValue}
            label="text color"
          />

          <ColorPicker
            value={accentValue}
            setValue={setAccentValue}
            label="accent color"
          />

          <ColorPicker
            value={accentTextValue}
            setValue={setAccentTextValue}
            label="text on accent"
          />

          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

const ColorPicker = (props: {
  label?: string;
  value: Color;
  setValue: Dispatch<SetStateAction<Color>>;
}) => {
  let thumbStyle =
    "w-4 h-4 rounded-full border-2 border-white shadow-[0_0_0_1px_black,_inset_0_0_0_1px_black]";
  return (
    <SpectrumColorPicker
      defaultValue={props.value}
      value={props.value}
      onChange={props.setValue}
    >
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <strong>{props.label}</strong>
          <ColorField defaultValue={props.value} className="w-fit">
            <Input className="w-[88px]" />
          </ColorField>
        </div>

        <ColorArea
          defaultValue={props.value}
          className="w-full h-[100px] rounded-md"
          colorSpace="hsb"
          xChannel="saturation"
          yChannel="brightness"
        >
          <ColorThumb className={thumbStyle} />
        </ColorArea>
        <ColorSlider
          defaultValue={props.value}
          className="w-full h-6 "
          channel="hue"
        >
          <SliderTrack className="h-6 w-full rounded-md">
            <ColorThumb className={`${thumbStyle} mt-[11px]`} />
          </SliderTrack>
        </ColorSlider>
      </div>
    </SpectrumColorPicker>
  );
};
