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

import { useMemo, useState } from "react";
import { BlockImageSmall, CloseConstrastSmall } from "components/Icons";
import { ReplicacheMutators, useEntity, useReplicache } from "src/replicache";
import { Replicache } from "replicache";
import { FilterAttributes } from "src/replicache/attributes";
import { useColorAttribute } from "components/ThemeManager/useColorAttribute";
import { addImage } from "src/utils/addImage";

function colorToString(value: Color) {
  return value.toString("rgb").slice(4, -1);
}

export type pickers =
  | "null"
  | "page"
  | "card"
  | "accent"
  | "accentText"
  | "text";

function setColorAttribute(
  rep: Replicache<ReplicacheMutators> | null,
  entity: string,
) {
  return (attribute: keyof FilterAttributes<{ type: "color" }>) =>
    (color: Color) =>
      rep?.mutate.assertFact({
        entity,
        attribute,
        data: { type: "color", value: colorToString(color) },
      });
}
export const ThemePopover = (props: { entityID: string }) => {
  let { rep } = useReplicache();
  // I need to get these variables from replicache and then write them to the DB. I also need to parse them into a state that can be used here.
  let pageValue = useColorAttribute(props.entityID, "theme/page-background");
  let cardValue = useColorAttribute(props.entityID, "theme/card-background");
  let cardBGAlpha = useEntity(props.entityID, "theme/card-background-alpha");
  let primaryValue = useColorAttribute(props.entityID, "theme/primary");
  let accentBGValue = useColorAttribute(
    props.entityID,
    "theme/accent-background",
  );
  let backgroundImage = useEntity(props.entityID, "theme/background-image");
  let backgroundRepeat = useEntity(
    props.entityID,
    "theme/background-image-repeat",
  );
  let accentTextValue = useColorAttribute(props.entityID, "theme/accent-text");
  let [openPicker, setOpenPicker] = useState<pickers>("page");
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
    `radial-gradient(at ${randomPositions[0]}, ${accentBGValue.toString("hex")}80 2px, transparent 70%)`,
    `radial-gradient(at ${randomPositions[1]}, ${cardValue.toString("hex")}66 2px, transparent 60%)`,
    `radial-gradient(at ${randomPositions[2]}, ${primaryValue.toString("hex")}B3 2px, transparent 100%)`,
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
                <BGPicker
                  entityID={props.entityID}
                  thisPicker={"page"}
                  openPicker={openPicker}
                  setOpenPicker={setOpenPicker}
                  closePicker={() => setOpenPicker("null")}
                />
                <div className="w-2 h-full border-t-2 border-r-2 border-border rounded-tr-md mt-[13px]" />
              </div>
              <div
                style={{
                  backgroundImage: `url(${backgroundImage?.data.src})`,
                  backgroundRepeat: backgroundRepeat ? "repeat" : "no-repeat",
                  backgroundSize: !backgroundRepeat
                    ? "cover"
                    : `calc(${backgroundRepeat.data.value}px / 2 )`,
                }}
                className="bg-bg-page p-3 pb-0 flex flex-col rounded-md"
              >
                <div className="themeAccentControls flex flex-col h-full">
                  <div className="themeAccentColor flex w-full pr-2 items-start ">
                    <ColorPicker
                      label="Accent"
                      value={accentBGValue}
                      setValue={set("theme/accent-background")}
                      thisPicker={"accent"}
                      openPicker={openPicker}
                      setOpenPicker={setOpenPicker}
                      closePicker={() => setOpenPicker("null")}
                    />
                    <div className="w-4 h-full border-t-2 border-r-2 border-accent rounded-tr-md mt-[13px] pb-[52px] -mb-[52px]" />
                  </div>
                  <div className="themeTextAccentColor w-full flex pr-2 pb-1 items-start ">
                    <div className="flex w-full  gap-2 items-center place-self-end">
                      <ColorPicker
                        label="Text on Accent"
                        value={accentTextValue}
                        setValue={set("theme/accent-text")}
                        thisPicker={"accentText"}
                        openPicker={openPicker}
                        setOpenPicker={setOpenPicker}
                        closePicker={() => setOpenPicker("null")}
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
                      alpha={{
                        value: cardBGAlpha?.data.value || 1,
                        onChange: (a) => {
                          if (!rep) return;
                          rep.mutate.assertFact({
                            entity: props.entityID,
                            attribute: "theme/card-background-alpha",
                            data: { type: "number", value: a },
                          });
                        },
                      }}
                      setValue={set("theme/card-background")}
                      thisPicker={"card"}
                      openPicker={openPicker}
                      setOpenPicker={setOpenPicker}
                      closePicker={() => setOpenPicker("null")}
                    />
                    <div className="w-4 h-full border-t border-r border-border rounded-tr-md mt-3" />
                  </div>
                  <div className="themePageTextColor w-full flex pr-2 items-start">
                    <div className="flex w-full gap-2 items-center place-self-end">
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
                    <div className="w-2 h-full border-b border-r border-t border-border rounded-r-md mt-3 z-10 " />
                    <div className="w-2 h-full border-r border-border " />
                  </div>
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

let thumbStyle =
  "w-4 h-4 rounded-full border-2 border-white shadow-[0_0_0_1px_black,_inset_0_0_0_1px_black]";
const ColorPicker = (props: {
  label?: string;
  value: Color;
  alpha?: { value: number; onChange: (alpha: number) => void };
  setValue: (c: Color) => void;
  openPicker: pickers;
  thisPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
  closePicker: () => void;
}) => {
  let value = useMemo(() => {
    if (!props.alpha) return props.value;
    return props.value
      .toFormat("rgba")
      .withChannelValue("alpha", props.alpha.value);
  }, [props.value, props.alpha]);
  return (
    <SpectrumColorPicker value={value} onChange={props.setValue}>
      <div className="flex flex-col w-full">
        <button
          onClick={() => {
            props.setOpenPicker(props.thisPicker);
          }}
          className="colorPickerLabel flex gap-1 items-center place-self-end py-[2px] pl-1 mb-1 rounded-md"
        >
          <strong className="text-primary">{props.label}</strong>
          <div className="flex">
            <ColorField className="w-fit" defaultValue={value}>
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
          <div className="flex items-center">
            <ColorSwatch
              color={value}
              className={`w-6 h-6 rounded-full  border-2 border-border`}
              style={{
                backgroundSize: "cover",
              }}
            />
            <div className="border border-border w-1" />
          </div>
        </button>
        {props.openPicker === props.thisPicker && (
          <div className="w-full flex flex-col gap-2 pb-3">
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
                    value={value}
                    colorSpace="hsb"
                    className="w-full pt-1"
                    channel="alpha"
                    onChange={(value) => {
                      props.alpha?.onChange(value.getChannelValue("alpha"));
                    }}
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
}) => {
  let bgImage = useEntity(props.entityID, "theme/background-image");
  let bgColor = useColorAttribute(props.entityID, "theme/page-background");
  let open = props.openPicker == props.thisPicker;
  let { rep } = useReplicache();

  return (
    <div>
      <button
        onClick={() => {
          props.setOpenPicker(props.thisPicker);
        }}
        className="colorPickerLabel flex gap-1 items-center place-self-end py-[2px] pl-1 mb-1 rounded-md"
      >
        <strong className="text-primary">Background</strong>
        <div className="flex">
          <ColorField className="w-fit" defaultValue={bgColor}>
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
              className="w-[72px] bg-transparent outline-none text-primary"
            />
          </ColorField>

          <label className="hover:cursor-pointer ">
            <div className="opacity-30 hover:opacity-100 hover:text-accent">
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
                }}
              />
            </div>
          </label>
        </div>
        <div className="flex items-center">
          <ColorSwatch
            color={bgColor}
            className={`w-6 h-6 rounded-full  border-2 border-border`}
            style={{
              backgroundImage: `url(${bgImage?.data.src})`,
              backgroundSize: "cover",
            }}
          />
          <div className="border border-border w-1" />
        </div>
      </button>
      {open && (
        <div className="w-full flex flex-col gap-2 pb-3">
          {props.thisPicker === "page" && bgImage ? (
            <ImageSettings entityID={props.entityID} />
          ) : (
            <SpectrumColorPicker
              value={bgColor}
              onChange={setColorAttribute(
                rep,
                props.entityID,
              )("theme/page-background")}
            >
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
            </SpectrumColorPicker>
          )}
        </div>
      )}
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
          <div className="opacity-30 hover:opacity-100 hover:text-accent">
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
            checked={!repeat}
            onChange={async (e) => {
              if (!e.currentTarget.checked) return;
              if (!repeat) return;
              await rep?.mutate.retractFact({ factID: repeat.id });
            }}
          />
          <div
            className={`border border-accent rounded-md px-1 py-0.5 cursor-pointer ${!repeat ? "bg-accent text-accentText" : "bg-transparent text-accent"}`}
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
            className={`border border-accent rounded-md px-1 py-0.5 cursor-pointer ${repeat ? "bg-accent text-accentText" : "bg-transparent text-accent"}`}
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
    </>
  );
};
