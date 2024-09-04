"use client";
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

import { useEffect, useMemo, useState } from "react";
import {
  BlockImageSmall,
  CloseContrastSmall,
  PaintSmall,
  PopoverArrow,
} from "components/Icons";
import { ReplicacheMutators, useEntity, useReplicache } from "src/replicache";
import { Replicache } from "replicache";
import { FilterAttributes } from "src/replicache/attributes";
import {
  colorToString,
  useColorAttribute,
} from "components/ThemeManager/useColorAttribute";
import { addImage } from "src/utils/addImage";
import { Separator } from "components/Layout";
import { useEntitySetContext } from "components/EntitySetProvider";
import { isIOS, useViewportSize } from "@react-aria/utils";
import { onMouseDown } from "src/utils/iosInputMouseDown";
import { HoverButton } from "components/Buttons";

export type pickers =
  | "null"
  | "leaflet"
  | "card"
  | "accent-1"
  | "accent-2"
  | "text"
  | "highlight-1"
  | "highlight-2"
  | "highlight-3";

export function setColorAttribute(
  rep: Replicache<ReplicacheMutators> | null,
  entity: string,
) {
  return (attribute: keyof FilterAttributes<{ type: "color" }>) =>
    (color: Color) =>
      rep?.mutate.assertFact({
        entity,
        attribute,
        data: { type: "color", value: colorToString(color, "hsba") },
      });
}
export const ThemePopover = (props: { entityID: string; home?: boolean }) => {
  let { rep } = useReplicache();
  // I need to get these variables from replicache and then write them to the DB. I also need to parse them into a state that can be used here.
  let leafletValue = useColorAttribute(
    props.entityID,
    "theme/leaflet-background",
  );
  let cardValue = useColorAttribute(props.entityID, "theme/card-background");
  let primaryValue = useColorAttribute(props.entityID, "theme/primary");
  let accent1Value = useColorAttribute(
    props.entityID,
    "theme/accent-background",
  );
  let accent2Value = useColorAttribute(props.entityID, "theme/accent-text");
  let permission = useEntitySetContext().permissions.write;
  let backgroundImage = useEntity(props.entityID, "theme/background-image");
  let backgroundRepeat = useEntity(
    props.entityID,
    "theme/background-image-repeat",
  );

  let [openPicker, setOpenPicker] = useState<pickers>(
    props.home === true ? "leaflet" : "null",
  );
  let set = useMemo(() => {
    return setColorAttribute(rep, props.entityID);
  }, [rep, props.entityID]);

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
    `radial-gradient(at ${randomPositions[0]}, ${accent1Value.toString("hex")}80 2px, transparent 70%)`,
    `radial-gradient(at ${randomPositions[1]}, ${cardValue.toString("hex")}66 2px, transparent 60%)`,
    `radial-gradient(at ${randomPositions[2]}, ${primaryValue.toString("hex")}B3 2px, transparent 100%)`,
  ].join(", ");
  let viewheight = useViewportSize().height;
  if (!permission) return null;

  return (
    <>
      <Popover.Root>
        <Popover.Trigger>
          <HoverButton
            icon=<PaintSmall />
            label="Theme"
            background="bg-bg-card"
            text="text-bg-card"
            backgroundImage={{
              backgroundColor: leafletValue.toString("hex"),
              backgroundImage: gradient,
            }}
          />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            style={{ maxHeight: viewheight ? viewheight * 0.8 : "80vh" }}
            className="z-20 themeSetterWrapper w-80 h-fit bg-white rounded-md border border-border flex"
            align="center"
            sideOffset={6}
            collisionPadding={16}
          >
            <div className="themeSetterContent flex flex-col w-full overflow-y-scroll no-scrollbar">
              <div className="themeBGLeaflet flex">
                <BGPicker
                  entityID={props.entityID}
                  thisPicker={"leaflet"}
                  openPicker={openPicker}
                  setOpenPicker={setOpenPicker}
                  closePicker={() => setOpenPicker("null")}
                  setValue={set("theme/leaflet-background")}
                />
              </div>

              <div
                style={{
                  backgroundImage: `url(${backgroundImage?.data.src})`,
                  backgroundRepeat: backgroundRepeat ? "repeat" : "no-repeat",
                  backgroundSize: !backgroundRepeat
                    ? "cover"
                    : `calc(${backgroundRepeat.data.value}px / 2 )`,
                }}
                className={`bg-bg-leaflet mx-2 p-3  mb-3 flex flex-col rounded-md  border border-border ${props.home ? "" : "pb-0"}`}
              >
                <div className={`flex flex-col z-10 mt-4 -mb-[6px] `}>
                  <div
                    className="themeLeafletControls text-accent-2 flex flex-col gap-2 h-full  bg-bg-leaflet p-2 rounded-md border border-accent-2 shadow-[0_0_0_1px_rgb(var(--accent))]"
                    style={{
                      backgroundColor: "rgba(var(--accent-1), 0.6)",
                    }}
                  >
                    <ColorPicker
                      label="Accent"
                      value={accent1Value}
                      setValue={set("theme/accent-background")}
                      thisPicker={"accent-1"}
                      openPicker={openPicker}
                      setOpenPicker={setOpenPicker}
                      closePicker={() => setOpenPicker("null")}
                    />
                    <ColorPicker
                      label="Text on Accent"
                      value={accent2Value}
                      setValue={set("theme/accent-text")}
                      thisPicker={"accent-2"}
                      openPicker={openPicker}
                      setOpenPicker={setOpenPicker}
                      closePicker={() => setOpenPicker("null")}
                    />
                  </div>
                  <SectionArrow
                    fill={theme.colors["accent-2"]}
                    stroke={theme.colors["accent-1"]}
                    className="ml-2"
                  />
                </div>

                <div className="font-bold relative text-center text-lg py-2  rounded-md bg-accent-1 text-accent-2 shadow-md">
                  Example Button
                </div>
                {!props.home && (
                  <>
                    {/* <hr className="my-3" /> */}
                    <div className="flex flex-col pt-8 -mb-[6px] z-10">
                      <div
                        className="themeLeafletControls flex flex-col gap-2 h-full text-primary bg-bg-leaflet p-2 rounded-md border border-primary shadow-[0_0_0_1px_rgb(var(--bg-card))]"
                        style={{ backgroundColor: "rgba(var(--bg-card), 0.6)" }}
                      >
                        <div className="themeLeafletColor flex items-start ">
                          <ColorPicker
                            label="Leaflet"
                            alpha
                            value={cardValue}
                            setValue={set("theme/card-background")}
                            thisPicker={"card"}
                            openPicker={openPicker}
                            setOpenPicker={setOpenPicker}
                            closePicker={() => setOpenPicker("null")}
                          />
                        </div>
                        <div className="themeLeafletTextColor w-full flex pr-2 items-start">
                          <ColorPicker
                            label="Text"
                            value={primaryValue}
                            setValue={set("theme/primary")}
                            thisPicker={"text"}
                            openPicker={openPicker}
                            setOpenPicker={setOpenPicker}
                            closePicker={() => setOpenPicker("null")}
                          />
                        </div>
                      </div>
                      <SectionArrow
                        fill={theme.colors["primary"]}
                        stroke={theme.colors["bg-card"]}
                        className=" ml-2"
                      />
                    </div>

                    <div
                      className="rounded-t-lg p-2  border border-border border-b-transparent shadow-md text-primary"
                      style={{
                        backgroundColor:
                          "rgba(var(--bg-card), var(--bg-card-alpha))",
                      }}
                    >
                      <p className="font-bold">Hello!</p>
                      <small className="">
                        Welcome to{" "}
                        <span className="font-bold text-accent-contrast">
                          Leaflet
                        </span>
                        . It&apos;s a super easy and fun way to make, share, and
                        collab on little bits of paper
                      </small>
                    </div>
                  </>
                )}
              </div>
            </div>
            <Popover.Arrow asChild width={16} height={8} viewBox="0 0 16 8">
              <PopoverArrow
                arrowFill={theme.colors["white"]}
                arrowStroke={theme.colors["border"]}
              />
            </Popover.Arrow>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
};

let thumbStyle =
  "w-4 h-4 rounded-full border-2 border-white shadow-[0_0_0_1px_#8C8C8C,_inset_0_0_0_1px_#8C8C8C]";

export const ColorPicker = (props: {
  label?: string;
  value: Color | undefined;
  alpha?: boolean;
  setValue: (c: Color) => void;
  openPicker: pickers;
  thisPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
  closePicker: () => void;
}) => {
  return (
    <SpectrumColorPicker value={props.value} onChange={props.setValue}>
      <div className="flex flex-col w-full gap-2">
        <div className="colorPickerLabel flex gap-2 items-center ">
          <button
            className="flex gap-2 items-center "
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
              className={`w-6 h-6 rounded-full border-2 border-white shadow-[0_0_0_1px_#8C8C8C]`}
              style={{
                backgroundSize: "cover",
              }}
            />
            <strong className="">{props.label}</strong>
          </button>

          <div className="flex gap-1">
            {props.value === undefined ? (
              <div>default</div>
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
                  className="w-[72px] bg-transparent outline-none"
                />
              </ColorField>
            )}
            {props.alpha && (
              <>
                <Separator classname="my-1" />
                <ColorField className="w-fit pl-[6px]" channel="alpha">
                  <Input
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
                    className="w-[72px] bg-transparent outline-none text-primary"
                  />
                </ColorField>
              </>
            )}
          </div>
        </div>
        {props.openPicker === props.thisPicker && (
          <div className="w-full flex flex-col gap-2 px-1">
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
              </>
            }
          </div>
        )}
      </div>
    </SpectrumColorPicker>
  );
};

const BGPicker = (props: {
  entityID: string;
  openPicker: pickers;
  thisPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
  closePicker: () => void;
  setValue: (c: Color) => void;
}) => {
  let bgImage = useEntity(props.entityID, "theme/background-image");
  let bgColor = useColorAttribute(props.entityID, "theme/leaflet-background");
  let open = props.openPicker == props.thisPicker;
  let { rep } = useReplicache();

  return (
    <div
      className={`bgPicker flex flex-col gap-0 -mb-[6px] z-10 w-full px-2 pt-3`}
    >
      <div className="bgPickerBody w-full flex flex-col gap-2 p-2 border border-[#CCCCCC] rounded-md">
        <div className="bgPickerLabel flex justify-between place-items-center ">
          <div className="bgPickerColorLabel flex gap-2 items-center">
            <button
              onClick={() => {
                if (props.openPicker === props.thisPicker) {
                  props.setOpenPicker("null");
                } else {
                  props.setOpenPicker(props.thisPicker);
                }
              }}
              className="flex gap-2 items-center"
            >
              <ColorSwatch
                color={bgColor}
                className={`w-6 h-6 rounded-full border-2 border-white shadow-[0_0_0_1px_#8C8C8C]`}
                style={{
                  backgroundImage: `url(${bgImage?.data.src})`,
                  backgroundSize: "cover",
                }}
              />
              <strong className="text-[#595959]">Background</strong>
            </button>

            <div className="flex">
              {bgImage ? (
                <div>Image</div>
              ) : (
                <ColorField className="w-fit gap-1" value={bgColor}>
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
                    className="w-[72px] bg-transparent outline-none text-[#595959]"
                  />
                </ColorField>
              )}
            </div>
          </div>
          <label className="hover:cursor-pointer h-fit">
            <div className="text-[#8C8C8C] hover:text-[#0000FF]">
              <BlockImageSmall />
            </div>
            <div className="hidden">
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  let file = e.currentTarget.files?.[0];
                  if (!file || !rep) return;
                  await addImage(file, rep, {
                    entityID: props.entityID,
                    attribute: "theme/background-image",
                  });
                  props.setOpenPicker(props.thisPicker);
                }}
              />
            </div>
          </label>
        </div>
        {open && (
          <div className="bgImageAndColorPicker w-full flex flex-col gap-2 pb-2">
            {bgImage ? (
              <ImageSettings entityID={props.entityID} />
            ) : (
              <SpectrumColorPicker
                value={bgColor}
                onChange={setColorAttribute(
                  rep,
                  props.entityID,
                )("theme/leaflet-background")}
              >
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
              </SpectrumColorPicker>
            )}
          </div>
        )}
      </div>
      <SectionArrow fill="white" stroke="#CCCCCC" className="ml-2 -mt-[1px]" />
    </div>
  );
};

const ImageSettings = (props: { entityID: string }) => {
  let image = useEntity(props.entityID, "theme/background-image");
  let repeat = useEntity(props.entityID, "theme/background-image-repeat");
  let { rep } = useReplicache();
  return (
    <>
      <div
        style={{
          backgroundImage: `url(${image?.data.src})`,
        }}
        className="themeBGImagePreview flex gap-2 place-items-center justify-center w-full h-[128px]  bg-cover bg-center bg-no-repeat"
      >
        <label className="hover:cursor-pointer ">
          <div
            className="flex gap-2 rounded-md px-2 py-1 text-accent-contrast font-bold"
            style={{ backgroundColor: "rgba(var(--bg-card), .6" }}
          >
            <BlockImageSmall /> Change Image
          </div>
          <div className="hidden">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                let file = e.currentTarget.files?.[0];
                if (!file || !rep) return;
                await addImage(file, rep, {
                  entityID: props.entityID,
                  attribute: "theme/background-image",
                });
              }}
            />
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
              if (repeat) await rep?.mutate.retractFact({ factID: repeat.id });
            }}
          />
          <div
            className={`shink-0 grow-0 w-fit border border-accent-1 rounded-md px-1 py-0.5 cursor-pointer ${!repeat ? "bg-accent-1 text-accent-2" : "bg-transparent text-accent-1"}`}
          >
            cover
          </div>
        </label>
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
                attribute: "theme/background-image-repeat",
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
        {repeat && (
          <Slider.Root
            className="relative grow flex items-center select-none touch-none w-full h-fit"
            value={[repeat.data.value]}
            max={3000}
            min={10}
            step={10}
            onValueChange={(value) => {
              rep?.mutate.assertFact({
                entity: props.entityID,
                attribute: "theme/background-image-repeat",
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

export const SectionArrow = (props: {
  fill: string;
  stroke: string;
  className: string;
}) => {
  return (
    <svg
      width="24"
      height="12"
      viewBox="0 0 24 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <path d="M11.9999 12L24 0H0L11.9999 12Z" fill={props.fill} />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.33552 0L12 10.6645L22.6645 0H24L12 12L0 0H1.33552Z"
        fill={props.stroke}
      />
    </svg>
  );
};
