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
  ColorSwatch,
} from "react-aria-components";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { imageArgs } from "./page";

function setCSSVariableToColor(name: string, value: Color) {
  let root = document.querySelector(":root") as HTMLElement;
  root?.style.setProperty(name, value.toString("hsl"));
}
export type pickers =
  | "null"
  | "page"
  | "card"
  | "accent"
  | "accentText"
  | "text";
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
  let [openPicker, setOpenPicker] = useState<pickers>("null");

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
        <div className="rounded-full w-6 h-6 border" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="w-80 max-h-[800px] overflow-y-scroll bg-bg-card rounded-md border border-border flex"
          align="center"
          sideOffset={4}
          collisionPadding={16}
        >
          <div className="flex flex-col w-full">
            <div className="themeBGPage flex mt-3 pr-2 pl-3 items-start ">
              <ColorLabel
                label="Background"
                value={pageValue}
                setValue={(newPageValue) => setPageValue(newPageValue)}
                thisPicker={"page"}
                openPicker={openPicker}
                setOpenPicker={(thisPicker: pickers) =>
                  setOpenPicker(thisPicker)
                }
                closePicker={() => setOpenPicker("null")}
              />
              <div className="w-2 h-full border-t border-r border-border rounded-tr-md mt-3" />
            </div>
            <div className="bg-bg-page p-3 pb-0 flex flex-col rounded-md">
              <div className="themeAccentSection">
                <div className="themeAccentControls flex flex-col h-full">
                  <div className="themeAccent flex w-full pr-2 items-start ">
                    <ColorLabel
                      label="Accent"
                      value={accentValue}
                      setValue={(newAccentValue) =>
                        setAccentValue(newAccentValue)
                      }
                      thisPicker={"accent"}
                      openPicker={openPicker}
                      setOpenPicker={(thisPicker: pickers) =>
                        setOpenPicker(thisPicker)
                      }
                      closePicker={() => setOpenPicker("null")}
                    />
                    <div className="w-4 h-full border-t border-r border-border rounded-tr-md mt-3 pb-[52px] -mb-[52px]" />
                  </div>
                  <div className="themeTextAccentColor flex pr-4 items-start place-self-end">
                    <div className="flex gap-2 items-center">
                      <ColorLabel
                        label="Text on Accent"
                        value={accentTextValue}
                        setValue={(newAccentTextValue) =>
                          setAccentTextValue(newAccentTextValue)
                        }
                        thisPicker={"accentText"}
                        openPicker={openPicker}
                        setOpenPicker={(thisPicker: pickers) =>
                          setOpenPicker(thisPicker)
                        }
                        closePicker={() => setOpenPicker("null")}
                      />
                    </div>
                    <div className="w-2 h-full border-b border-r border-t border-border rounded-r-md mt-3 z-10" />
                  </div>
                  <div className="font-bold text-center text-lg py-2  rounded-md bg-accent text-accentText shadow-md">
                    Button
                  </div>
                </div>
              </div>
              <hr className="my-3" />

              <div className="themePageSection">
                <div className="flex flex-col">
                  <div className="themePageColor flex pr-2 items-start place-self-end">
                    <div className="flex gap-2 items-center">
                      <ColorLabel
                        label="Page"
                        value={cardValue}
                        setValue={(newCardValue) => setCardValue(newCardValue)}
                        thisPicker={"card"}
                        openPicker={openPicker}
                        setOpenPicker={(thisPicker: pickers) =>
                          setOpenPicker(thisPicker)
                        }
                        closePicker={() => setOpenPicker("null")}
                      />
                    </div>
                    <div className="w-4 h-14 border-t border-r border-border rounded-tr-md mt-3 -mb-9" />
                  </div>
                  <div className="themePageText flex pr-4 items-start place-self-end">
                    <div className="flex gap-2 items-center">
                      <ColorLabel
                        label="Text"
                        value={textValue}
                        setValue={(newTextValue) => setTextValue(newTextValue)}
                        thisPicker={"text"}
                        openPicker={openPicker}
                        setOpenPicker={(thisPicker: pickers) =>
                          setOpenPicker(thisPicker)
                        }
                        closePicker={() => setOpenPicker("null")}
                      />
                    </div>
                    <div className="w-2 h-12 border-b border-r border-t border-border rounded-r-md mt-3 -mb-6" />
                  </div>
                </div>

                <div className="bg-bg-card rounded-t-lg p-2  border border-border border-b-transparent shadow-md">
                  <p className="font-bold">Hello!</p>
                  <small className="">
                    Welcome to Leaflet. It&apos;s a super easy and fun way to
                    make, share, and collab on little bits of paper
                  </small>
                </div>
              </div>
            </div>
          </div>

          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

const ColorLabel = (props: {
  label?: string;
  value: Color;

  setValue: Dispatch<SetStateAction<Color>>;
  openPicker: pickers;
  thisPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
  closePicker: () => void;
}) => {
  let thumbStyle =
    "w-4 h-4 rounded-full border-2 border-white shadow-[0_0_0_1px_black,_inset_0_0_0_1px_black]";
  return (
    <SpectrumColorPicker value={props.value} onChange={props.setValue}>
      <div className="flex flex-col w-full">
        <div className="flex gap-1 items-center place-self-end pb-2">
          <strong className="text-primary">{props.label}</strong>
          <div className="flex">
            <ColorField className="w-fit" defaultValue={props.value}>
              <Input
                onFocus={() => {
                  if (props.openPicker === props.thisPicker) {
                    props.closePicker();
                  } else {
                    props.setOpenPicker(props.thisPicker);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  } else return;
                }}
                onBlur={(e) => {
                  props.setValue(parseColor(e.currentTarget.value));
                }}
                className="w-[72px] bg-transparent outline-none text-primary"
              />
            </ColorField>
          </div>
          <button
            onClick={() => {
              if (props.openPicker === props.thisPicker) {
                props.closePicker();
              } else {
                props.setOpenPicker(props.thisPicker);
              }
            }}
          >
            <ColorSwatch
              color={props.value}
              className={`w-6 h-6 rounded-full  border border-border`}
            />
          </button>
        </div>
        {props.openPicker === props.thisPicker && (
          <div className="flex flex-col gap-2 pb-3">
            <ColorArea
              className="w-full h-[128px] rounded-md"
              colorSpace="hsb"
              xChannel="saturation"
              yChannel="brightness"
            >
              <ColorThumb className={thumbStyle} />
            </ColorArea>
            <ColorSlider colorSpace="hsb" className="w-full  " channel="hue">
              <SliderTrack className="h-2 w-full rounded-md">
                <ColorThumb className={`${thumbStyle} mt-[4px]`} />
              </SliderTrack>
            </ColorSlider>
          </div>
        )}
      </div>
    </SpectrumColorPicker>
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
    <SpectrumColorPicker value={props.value} onChange={props.setValue}>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <strong>{props.label}</strong>
          <ColorField className="w-fit">
            <Input
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                } else return;
              }}
              className="w-[88px]  "
            />
          </ColorField>
        </div>

        <ColorArea
          className="w-full h-[300px] rounded-md"
          colorSpace="hsb"
          xChannel="saturation"
          yChannel="brightness"
        >
          <ColorThumb className={thumbStyle} />
        </ColorArea>
        <ColorSlider colorSpace="hsb" className="w-full h-6 " channel="hue">
          <SliderTrack className="h-6 w-full rounded-md">
            <ColorThumb className={`${thumbStyle} mt-[11px]`} />
          </SliderTrack>
        </ColorSlider>
      </div>
    </SpectrumColorPicker>
  );
};

const BGPicker = (props: {
  pageBGImage: imageArgs;
  setPageBGImage: (imageArgs: Partial<imageArgs>) => void;
}) => {
  return (
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
  );
};
