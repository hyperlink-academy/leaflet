import * as Popover from "@radix-ui/react-popover";
import * as Slider from "@radix-ui/react-slider";
import { theme } from "../../tailwind.config";

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
import { CloseConstrastSmall, BlockImageSmall } from "components/Icons";

function setCSSVariableToColor(name: string, value: Color) {
  let colorStringLength = value.toString("rgb").length;
  let root = document.querySelector(":root") as HTMLElement;
  root?.style.setProperty(
    name,
    value.toString("rgb").substring(4, colorStringLength - 1),
  );
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
              <div className="themeBGPage flex pt-1 pr-2 pl-0 items-start">
                <ColorPicker
                  label="Background"
                  value={pageValue}
                  setValue={(newPageValue) => setPageValue(newPageValue)}
                  thisPicker={"page"}
                  openPicker={openPicker}
                  setOpenPicker={(thisPicker: pickers) =>
                    setOpenPicker(thisPicker)
                  }
                  closePicker={() => setOpenPicker("null")}
                  pageBGImage={props.pageBGImage}
                  setPageBGImage={props.setPageBGImage}
                />
                <div className="w-2 h-full border-t-2 border-r-2 border-border rounded-tr-md mt-[13px]" />
              </div>
              <div
                className="bg-bg-page p-3 pb-0 flex flex-col rounded-md"
                style={{
                  backgroundImage: `url(${props.pageBGImage.url})`,
                  backgroundRepeat: props.pageBGImage.repeat
                    ? "repeat"
                    : "no-repeat",
                  backgroundSize: !props.pageBGImage.repeat
                    ? "cover"
                    : `calc(${props.pageBGImage.size}px/ 2 )`,
                }}
              >
                <div className="themeAccentControls flex flex-col h-full">
                  <div className="themeAccentColor flex w-full pr-2 items-start ">
                    <ColorPicker
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
                      pageBGImage={props.pageBGImage}
                    />
                    <div className="w-4 h-full border-t-2 border-r-2 border-accent rounded-tr-md mt-[13px] pb-[52px] -mb-[52px]" />
                  </div>
                  <div className="themeTextAccentColor w-full flex pr-2 pb-1 items-start ">
                    <div className="flex w-full  gap-2 items-center place-self-end">
                      <ColorPicker
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
                        pageBGImage={props.pageBGImage}
                      />
                    </div>
                    <div className="w-2 h-full  border-r-2 border-t-2 border-border rounded-tr-md mt-[13px] z-10" />
                    <div className="w-2 h-full border-r-2 border-accent " />
                  </div>
                  <div className="font-bold relative text-center text-lg py-2  rounded-md bg-accent text-accentText shadow-md">
                    Button
                    <div className="absolute h-[26px] w-[92px] top-0 right-[15.5px] border-b-2 border-r-2 rounded-br-md border-border" />
                  </div>
                </div>
                <hr className="my-3" />

                <div className="themePageControls flex flex-col h-full pb-1">
                  <div className="themePageColor flex pr-2 items-start ">
                    <ColorPicker
                      label="Page"
                      value={cardValue}
                      alpha
                      setValue={(newCardValue) => setCardValue(newCardValue)}
                      thisPicker={"card"}
                      openPicker={openPicker}
                      setOpenPicker={(thisPicker: pickers) =>
                        setOpenPicker(thisPicker)
                      }
                      closePicker={() => setOpenPicker("null")}
                      pageBGImage={props.pageBGImage}
                    />
                    <div className="w-4 h-full border-t border-r border-border rounded-tr-md mt-3" />
                  </div>
                  <div className="themePageTextColor w-full flex pr-2 items-start">
                    <div className="flex w-full gap-2 items-center place-self-end">
                      <ColorPicker
                        label="Text"
                        value={textValue}
                        setValue={(newTextValue) => setTextValue(newTextValue)}
                        thisPicker={"text"}
                        openPicker={openPicker}
                        setOpenPicker={(thisPicker: pickers) =>
                          setOpenPicker(thisPicker)
                        }
                        closePicker={() => setOpenPicker("null")}
                        pageBGImage={props.pageBGImage}
                      />
                    </div>
                    <div className="w-2 h-full border-b border-r border-t border-border rounded-r-md mt-3 z-10 " />
                    <div className="w-2 h-full border-r border-border " />
                  </div>
                </div>

                <div
                  className="rounded-t-lg p-2  border border-border border-b-transparent shadow-md"
                  style={{
                    backgroundColor:
                      "rgba(var(--bg-card), var(--bg-card-alpha))",
                  }}
                >
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

const ColorPicker = (props: {
  label?: string;
  value: Color;
  alpha?: boolean;

  setValue: Dispatch<SetStateAction<Color>>;
  openPicker: pickers;
  thisPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
  closePicker: () => void;

  pageBGImage: imageArgs;
  setPageBGImage?: (imageArgs: Partial<imageArgs>) => void;
}) => {
  let bgImageExists =
    props.pageBGImage?.url !== undefined && props.pageBGImage?.url !== "";
  let thumbStyle =
    "w-4 h-4 rounded-full border-2 border-white shadow-[0_0_0_1px_black,_inset_0_0_0_1px_black]";
  return (
    <SpectrumColorPicker value={props.value} onChange={props.setValue}>
      <div className="flex flex-col w-full">
        <button
          onClick={() => {
            props.setOpenPicker(props.thisPicker);
          }}
          className="colorPickerLabel flex gap-1 items-center place-self-end py-[2px] pl-1 mb-1 rounded-md"
          style={{
            backgroundColor: bgImageExists
              ? "rgba(var(--bg-card), .6)"
              : "transparent",
          }}
        >
          <strong className="text-primary">{props.label}</strong>
          <div className="flex">
            {bgImageExists && props.thisPicker === "page" ? (
              <div className="w-[72px] text-left"> Image </div>
            ) : (
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
            )}
          </div>
          <div className="flex items-center">
            <ColorSwatch
              color={props.value}
              className={`w-6 h-6 rounded-full  border-2 border-border`}
              style={{
                backgroundImage:
                  props.thisPicker === "page"
                    ? `url(${props.pageBGImage?.url})`
                    : "none",
                backgroundSize: "cover",
              }}
            />
            <div className="border border-border w-1" />
          </div>
        </button>
        {props.openPicker === props.thisPicker && (
          <div className="w-full flex flex-col gap-2 pb-3">
            {props.thisPicker === "page" && bgImageExists ? (
              <BGImagePicker
                pageBGImage={props.pageBGImage ? props.pageBGImage : undefined}
                setPageBGImage={
                  props.setPageBGImage ? props.setPageBGImage : () => {}
                }
              />
            ) : (
              <>
                <ColorArea
                  className="w-full h-[128px] rounded-md"
                  colorSpace="hsb"
                  xChannel="saturation"
                  yChannel="brightness"
                >
                  <ColorThumb className={thumbStyle} />
                </ColorArea>
                <ColorSlider
                  colorSpace="hsb"
                  className="w-full  "
                  channel="hue"
                >
                  <SliderTrack className="h-2 w-full rounded-md">
                    <ColorThumb className={`${thumbStyle} mt-[4px]`} />
                  </SliderTrack>
                </ColorSlider>
                {props.alpha && (
                  <ColorSlider
                    colorSpace="hsb"
                    className="w-full pt-1"
                    channel="alpha"
                    onChange={(value) => {
                      let valueAlpha = value.getChannelValue("alpha");
                      let root = document.querySelector(":root") as HTMLElement;
                      root?.style.setProperty(
                        "--bg-card-alpha",
                        valueAlpha.toString(),
                      );
                    }}
                  >
                    <SliderTrack className="h-2 w-full rounded-md">
                      <ColorThumb className={`${thumbStyle} mt-[4px]`} />
                    </SliderTrack>
                  </ColorSlider>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </SpectrumColorPicker>
  );
};

const BGImagePicker = (props: {
  pageBGImage: imageArgs | undefined;
  setPageBGImage: (imageArgs: Partial<imageArgs>) => void;
}) => {
  let bgImageExists = props.pageBGImage && props.pageBGImage.url !== "";

  return !bgImageExists ? (
    //replace this with a file picker button
    <div className="flex gap-2 w-full text-border items-center">
      <BlockImageSmall />
      <input
        className="w-full text-primary bg-transparent border border-border rounded-md"
        type="text"
        id="url"
        name="url"
        value={props?.pageBGImage?.url}
        onChange={(e) => {
          props.setPageBGImage({
            url: e.currentTarget.value,
          });
        }}
      />
    </div>
  ) : (
    <div className="themeBGImagePicker flex flex-col border border-border rounded-md overflow-hidden">
      <div
        className="themeBGImagePreview flex gap-2 place-items-center justify-center w-full h-[128px]  bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${props.pageBGImage?.url})`,
        }}
      >
        <input
          className={`
          themeBGImageInput relative text-center rounded-md text-primary
         `}
          style={{
            backgroundColor: "rgba(var(--bg-card), 0.7)",
          }}
          type="text"
          id="url"
          name="url"
          value={props?.pageBGImage?.url}
          onChange={(e) => {
            props.setPageBGImage({
              url: e.currentTarget.value,
            });
          }}
        />
        <button onClick={() => props.setPageBGImage({ url: "" })}>
          <CloseConstrastSmall
            fill={theme.colors.primary}
            outline={theme.colors["bg-card"]}
          />
        </button>
      </div>
      <div className="themeBGImageControls p-2 flex gap-2 items-center">
        <label htmlFor="cover" className="flex shrink-0">
          <input
            className="appearance-none"
            type="radio"
            id="cover"
            name="cover"
            value="cover"
            checked={props?.pageBGImage?.repeat === false}
            onChange={() => {
              props.setPageBGImage({
                repeat: false,
              });
            }}
          />
          <div
            className={`border border-accent rounded-md px-1 py-0.5 cursor-pointer ${props?.pageBGImage?.repeat === false ? "bg-accent text-accentText" : "bg-transparent text-accent"}`}
          >
            cover
          </div>
        </label>
        <label htmlFor="repeat" className="flex shrink-0">
          <input
            className={`appearance-none `}
            type="radio"
            id="repeat"
            name="repeat"
            value="repeat"
            checked={props?.pageBGImage?.repeat === true}
            onChange={() => {
              props.setPageBGImage({
                repeat: true,
              });
            }}
          />
          <div
            className={`border border-accent rounded-md px-1 py-0.5 cursor-pointer ${props?.pageBGImage?.repeat === true ? "bg-accent text-accentText" : "bg-transparent text-accent"}`}
          >
            repeat
          </div>
        </label>
        {props.pageBGImage?.repeat && (
          <Slider.Root
            className="relative grow flex items-center select-none touch-none w-full h-fit"
            defaultValue={[props.pageBGImage?.size]}
            max={3000}
            min={10}
            step={10}
            onValueChange={(value) => {
              props.setPageBGImage({
                size: value[0],
              });
            }}
          >
            <Slider.Track className="bg-accent relative grow rounded-full h-[3px]">
              {/* <Slider.Range className="absolute bg-accentText rounded-full h-full" /> */}
            </Slider.Track>
            <Slider.Thumb
              className="flex w-4 h-4 rounded-full border-2 border-white bg-accent shadow-[0_0_0_1px_black,_inset_0_0_0_1px_black] cursor-pointer"
              aria-label="Volume"
            />
          </Slider.Root>
        )}
      </div>
    </div>
  );
};
