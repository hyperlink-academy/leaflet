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

import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  let [pageValue, setPageValue] = useState(parseColor("#F0F7FA"));
  let [cardValue, setCardValue] = useState(parseColor("#FFFFFF"));
  let [textValue, setTextValue] = useState(parseColor("#272727"));
  let [accentValue, setAccentValue] = useState(parseColor("#0000FF"));
  let [accentTextValue, setAccentTextValue] = useState(parseColor("#FFFFFF"));
  let [openPicker, setOpenPicker] = useState<pickers>("page");

  useEffect(() => {
    setCSSVariableToColor("--bg-page", pageValue);
    setCSSVariableToColor("--bg-card", cardValue);
    setCSSVariableToColor("--primary", textValue);
    setCSSVariableToColor("--accent", accentValue);
    setCSSVariableToColor("--accent-text", accentTextValue);
  }, [pageValue, cardValue, textValue, accentValue, accentTextValue]);

  let randomPositions = useMemo(() => {
    let values = [] as string[];
    for (let i = 0; i < 3; i++) {
      values.push(
        `${Math.floor(Math.random() * 100)}% ${Math.floor(Math.random() * 100)}%`,
      );
    }
    return values;
  }, []);

  let gradient = [
    `radial-gradient(at ${randomPositions[0]}, ${accentValue.toString("hex")}80 2px, transparent 70%)`,
    `radial-gradient(at ${randomPositions[1]}, ${cardValue.toString("hex")}66 2px, transparent 60%)`,
    `radial-gradient(at ${randomPositions[2]}, ${textValue.toString("hex")}B3 2px, transparent 100%)`,
  ].join(", ");

  return (
    <>
      <Popover.Root>
        <Popover.Trigger>
          <div
            className="rounded-full w-7 h-7 border border-border"
            style={{
              backgroundColor: pageValue.toString("hex"),
              backgroundImage: gradient,
            }}
          />

          <div className="relative z-10"></div>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="w-80 max-h-[800px] p-2 overflow-y-scroll bg-white rounded-md border border-border flex"
            align="center"
            sideOffset={4}
            collisionPadding={16}
          >
            <div className="flex flex-col w-full overflow-hidden ">
              <div className="themeBGPage flex pt-1 pr-2 pl-3 items-start">
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
                <div className="w-2 h-full border-t-2 border-r-2 border-border rounded-tr-md mt-3" />
              </div>
              <div className="bg-bg-page p-3 pb-0 flex flex-col rounded-md">
                <div className="themeAccentControls flex flex-col h-full">
                  <div className="themeAccentColor flex w-full pr-2 items-start ">
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
                    <div className="w-4 h-full border-t-2 border-r-2 border-accent rounded-tr-md mt-3 pb-[52px] -mb-[52px]" />
                  </div>
                  <div className="themeTextAccentColor w-full flex pr-2 items-start ">
                    <div className="flex w-full  gap-2 items-center place-self-end">
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
                    <div className="w-2 h-full  border-r-2 border-t-2 border-border rounded-tr-md mt-[11px] z-10" />
                    <div className="w-2 h-full border-r-2 border-accent " />
                  </div>
                  <div className="font-bold relative text-center text-lg py-2  rounded-md bg-accent text-accentText shadow-md">
                    Button
                    <div className="absolute h-[26px] w-[92px] top-0 right-[15.5px] border-b-2 border-r-2 rounded-br-md border-border" />
                  </div>
                </div>
                <hr className="my-3" />

                <div className="themePageControls flex flex-col h-full">
                  <div className="themePageColor flex pr-2 items-start ">
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
                    <div className="w-4 h-full border-t border-r border-border rounded-tr-md mt-3" />
                  </div>
                  <div className="themePageTextColor w-full flex pr-2 items-start">
                    <div className="flex w-full gap-2 items-center place-self-end">
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
                    <div className="w-2 h-full border-b border-r border-t border-border rounded-r-md mt-3 z-10 " />
                    <div className="w-2 h-full border-r border-border " />
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

            <Popover.Arrow />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
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
      <button
        className="flex flex-col w-full"
        onClick={() => {
          props.setOpenPicker(props.thisPicker);
        }}
      >
        <div className="flex gap-1 items-center place-self-end pb-2">
          <strong className="text-primary">{props.label}</strong>
          <div className="flex">
            <ColorField className="w-fit" defaultValue={props.value}>
              <Input
                onFocus={(e) => {
                  e.currentTarget.setSelectionRange(
                    1,
                    e.currentTarget.value.length,
                  );
                  props.setOpenPicker(props.thisPicker);
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
              props.setOpenPicker(props.thisPicker);
            }}
          >
            <ColorSwatch
              color={props.value}
              className={`w-6 h-6 rounded-full  border-2 border-border`}
            />
          </button>
        </div>
        {props.openPicker === props.thisPicker && (
          <div className="w-full flex flex-col gap-2 pb-3">
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
      </button>
    </SpectrumColorPicker>
  );
};
