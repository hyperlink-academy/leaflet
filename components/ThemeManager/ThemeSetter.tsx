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
  CheckboxChecked,
  CheckboxEmpty,
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
import { useInitialPageLoad } from "components/InitialPageLoadProvider";

export type pickers =
  | "null"
  | "leaflet"
  | "page"
  | "accent-1"
  | "accent-2"
  | "text"
  | "highlight-1"
  | "highlight-2"
  | "highlight-3"
  | "page-background-image";

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
  let pageLoaded = useInitialPageLoad();
  // I need to get these variables from replicache and then write them to the DB. I also need to parse them into a state that can be used here.
  let leafletValue = useColorAttribute(props.entityID, "theme/page-background");
  let pageValue = useColorAttribute(props.entityID, "theme/card-background");
  let primaryValue = useColorAttribute(props.entityID, "theme/primary");
  let accent1Value = useColorAttribute(
    props.entityID,
    "theme/accent-background",
  );
  let accent2Value = useColorAttribute(props.entityID, "theme/accent-text");

  let permission = useEntitySetContext().permissions.write;
  let leafletBGImage = useEntity(props.entityID, "theme/background-image");
  let leafletBGRepeat = useEntity(
    props.entityID,
    "theme/background-image-repeat",
  );
  let pageBGImage = useEntity(props.entityID, "theme/card-background-image");
  let pageBGRepeat = useEntity(
    props.entityID,
    "theme/card-background-image-repeat",
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
      if (!pageLoaded) values.push(`100% 100%`);
      else
        values.push(
          `${Math.floor(Math.random() * 100)}% ${Math.floor(Math.random() * 100)}%`,
        );
    }
    return values;
  }, [pageLoaded]);

  let gradient = [
    `radial-gradient(at ${randomPositions[0]}, ${accent1Value.toString("hex")}80 2px, transparent 70%)`,
    `radial-gradient(at ${randomPositions[1]}, ${pageValue.toString("hex")}66 2px, transparent 60%)`,
    `radial-gradient(at ${randomPositions[2]}, ${primaryValue.toString("hex")}B3 2px, transparent 100%)`,
  ].join(", ");
  let viewheight = useViewportSize().height;
  if (!permission) return null;

  return (
    <>
      <Popover.Root>
        <Popover.Trigger>
          <HoverButton
            icon={<PaintSmall />}
            noLabelOnMobile
            label="Theme"
            background="bg-bg-page"
            text="text-bg-page"
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
            sideOffset={4}
            collisionPadding={16}
          >
            <div className="themeSetterContent flex flex-col w-full overflow-y-scroll no-scrollbar">
              <div className="themeBGLeaflet flex">
                <div
                  className={`bgPicker flex flex-col gap-0 -mb-[6px] z-10 w-full px-2 pt-3`}
                >
                  <div className="bgPickerBody w-full flex flex-col gap-2 p-2 border border-[#CCCCCC] rounded-md">
                    <LeafletBGPicker
                      entityID={props.entityID}
                      thisPicker={"leaflet"}
                      openPicker={openPicker}
                      setOpenPicker={setOpenPicker}
                      closePicker={() => setOpenPicker("null")}
                      setValue={set("theme/page-background")}
                    />
                  </div>

                  <SectionArrow
                    fill="white"
                    stroke="#CCCCCC"
                    className="ml-2 -mt-[1px]"
                  />
                </div>
              </div>

              <div
                onClick={(e) => {
                  e.currentTarget === e.target && setOpenPicker("leaflet");
                }}
                style={{
                  backgroundImage: `url(${leafletBGImage?.data.src})`,
                  backgroundRepeat: leafletBGRepeat ? "repeat" : "no-repeat",
                  backgroundPosition: "center",
                  backgroundSize: !leafletBGRepeat
                    ? "cover"
                    : `calc(${leafletBGRepeat.data.value}px / 2 )`,
                }}
                className={`bg-bg-leaflet mx-2 p-3  mb-2 flex flex-col rounded-md  border border-border ${props.home ? "" : "pb-0"}`}
              >
                <div className={`flex flex-col z-10 mt-4 -mb-[6px] `}>
                  <div
                    className="themeLeafletControls text-accent-2 flex flex-col gap-2 h-full  bg-bg-leaflet p-2 rounded-md border border-accent-2 shadow-[0_0_0_1px_rgb(var(--accent-1))]"
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

                <div
                  onClick={(e) => {
                    e.target === e.currentTarget && setOpenPicker("accent-1");
                  }}
                  className="pointer-cursor font-bold relative text-center text-lg py-2  rounded-md bg-accent-1 text-accent-2 shadow-md flex items-center justify-center"
                >
                  <div
                    className="cursor-pointer w-fit"
                    onClick={() => {
                      setOpenPicker("accent-2");
                    }}
                  >
                    Example Button
                  </div>
                </div>

                <div className="flex flex-col mt-8 -mb-[6px] z-10">
                  <div
                    className="themeLeafletControls flex flex-col gap-2 h-full text-primary bg-bg-leaflet p-2 rounded-md border border-primary shadow-[0_0_0_1px_rgb(var(--bg-page))]"
                    style={{ backgroundColor: "rgba(var(--bg-page, 0.6)" }}
                  >
                    <ColorPicker
                      label={props.home ? "Menu" : "Page"}
                      alpha
                      value={pageValue}
                      setValue={set("theme/card-background")}
                      thisPicker={"page"}
                      openPicker={openPicker}
                      setOpenPicker={setOpenPicker}
                      closePicker={() => setOpenPicker("null")}
                    />
                    <ColorPicker
                      label={props.home ? "Menu Text" : "Page"}
                      value={primaryValue}
                      setValue={set("theme/primary")}
                      thisPicker={"text"}
                      openPicker={openPicker}
                      setOpenPicker={setOpenPicker}
                      closePicker={() => setOpenPicker("null")}
                    />
                  </div>
                  <SectionArrow
                    fill={theme.colors["primary"]}
                    stroke={theme.colors["bg-page"]}
                    className=" ml-2"
                  />
                </div>

                <SamplePage setOpenPicker={setOpenPicker} home={props.home} />
              </div>
              {!props.home && <WatermarkSetter entityID={props.entityID} />}
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
function WatermarkSetter(props: { entityID: string }) {
  let { rep } = useReplicache();
  let checked = useEntity(props.entityID, "theme/page-leaflet-watermark");
  return (
    <label className="px-3 pb-3 flex gap-2 items-start cursor-pointer">
      <input
        type="checkbox"
        checked={!!checked?.data.value}
        className="hidden"
        onChange={(e) => {
          rep?.mutate.assertFact({
            entity: props.entityID,
            attribute: "theme/page-leaflet-watermark",
            data: { type: "boolean", value: e.currentTarget.checked },
          });
        }}
      />
      {!checked?.data.value ? (
        <CheckboxEmpty className="shrink-0 mt-1 text-[#595959]" />
      ) : (
        <CheckboxChecked className="shrink-0 mt-1 text-[#595959]" />
      )}
      <div className="flex flex-col gap-0">
        <div className="text-sm font-bold text-[#595959]">
          Show Leaflet Watermark
        </div>
        <div className="text-sm text-[#969696]">
          If you like using Leaflet, consider helping us spread the word!
        </div>
      </div>
    </label>
  );
}

const SamplePage = (props: {
  home: boolean | undefined;
  setOpenPicker: (picker: "page" | "text") => void;
}) => {
  return (
    <div
      onClick={(e) => {
        e.currentTarget === e.target && props.setOpenPicker("page");
      }}
      className={`${props.home ? "rounded-md " : "rounded-t-lg "} cursor-pointer p-2  border border-border border-b-transparent shadow-md text-primary`}
      style={{
        backgroundColor: "rgba(var(--bg-page), var(--bg-page-alpha))",
      }}
    >
      <p
        onClick={() => {
          props.setOpenPicker("text");
        }}
        className=" cursor-pointer font-bold w-fit"
      >
        Hello!
      </p>
      <small onClick={() => props.setOpenPicker("text")}>
        Welcome to{" "}
        <span className="font-bold text-accent-contrast">Leaflet</span>.
        It&apos;s a super easy and fun way to make, share, and collab on little
        bits of paper
      </small>
    </div>
  );
};

let thumbStyle =
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
  children?: React.ReactNode;
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

export const LeafletBGPicker = (props: {
  entityID: string;
  openPicker: pickers;
  thisPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
  closePicker: () => void;
  setValue: (c: Color) => void;
  card?: boolean;
}) => {
  let bgImage = useEntity(
    props.entityID,
    props.card ? "theme/card-background-image" : "theme/background-image",
  );
  let bgColor = useColorAttribute(
    props.entityID,
    props.card ? "theme/card-background" : "theme/page-background",
  );
  let open = props.openPicker == props.thisPicker;
  let { rep } = useReplicache();

  return (
    <>
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
            <strong
              className={`${props.card ? "text-primary" : "text-[#595959]"}`}
            >
              {props.card ? "Page" : "Background"}
            </strong>
          </button>

          <div className="flex">
            {bgImage ? (
              <div
                className={`${props.card ? "text-secondary" : "text-[#969696]"}`}
              >
                Image
              </div>
            ) : (
              <>
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
                    className={`w-[72px] bg-transparent outline-none ${props.card ? "text-primary" : "text-[#595959]"}`}
                  />
                </ColorField>
                {props.card && (
                  <>
                    <Separator classname="my-1" />

                    <SpectrumColorPicker
                      value={bgColor}
                      onChange={setColorAttribute(
                        rep,
                        props.entityID,
                      )(
                        props.card
                          ? "theme/card-background"
                          : "theme/page-background",
                      )}
                    >
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
                          className="w-[48px] bg-transparent outline-none text-primary"
                        />
                      </ColorField>
                    </SpectrumColorPicker>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <label className="hover:cursor-pointer h-fit">
          <div
            className={
              props.card
                ? "text-tertiary hover:text-accent-contrast"
                : "text-[#8C8C8C] hover:text-[#0000FF]"
            }
          >
            <BlockImageSmall />
          </div>
          <div className="hidden">
            <ImageInput
              {...props}
              onChange={() => {
                props.setOpenPicker(props.thisPicker);
              }}
            />
          </div>
        </label>
      </div>
      {open && (
        <div className="bgImageAndColorPicker w-full flex flex-col gap-2 ">
          <SpectrumColorPicker
            value={bgColor}
            onChange={setColorAttribute(
              rep,
              props.entityID,
            )(props.card ? "theme/card-background" : "theme/page-background")}
          >
            {bgImage ? (
              <ImageSettings
                entityID={props.entityID}
                card={props.card}
                setValue={props.setValue}
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
              </>
            )}
            {props.card && (
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
          </SpectrumColorPicker>
        </div>
      )}
    </>
  );
};

export const PageBGPicker = (props: {
  entityID: string;
  openPicker: pickers;
  thisPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
  closePicker: () => void;
  setValue: (c: Color) => void;
}) => {
  let bgImage = useEntity(props.entityID, "theme/card-background-image");
  let bgColor = useColorAttribute(props.entityID, "theme/card-background");
  let bgAlpha =
    useEntity(props.entityID, "theme/card-background-image-opacity")?.data
      .value || 1;
  let alphaColor = useMemo(() => {
    return parseColor(`rgba(0,0,0,${bgAlpha})`);
  }, [bgAlpha]);
  let open = props.openPicker == props.thisPicker;
  let { rep } = useReplicache();

  return (
    <>
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
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          />
          <strong className={`text-primary`}>Background Image</strong>
        </button>

        <SpectrumColorPicker
          value={alphaColor}
          onChange={(c) => {
            let alpha = c.getChannelValue("alpha");
            rep?.mutate.assertFact({
              entity: props.entityID,
              attribute: "theme/card-background-image-opacity",
              data: { type: "number", value: alpha },
            });
          }}
        >
          <Separator classname="h-5 my-1" />
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
              className="w-[48px] bg-transparent outline-none text-primary"
            />
          </ColorField>
        </SpectrumColorPicker>
      </div>
      {open && (
        <div className="pageImagePicker flex flex-col gap-2">
          <ImageSettings
            entityID={props.entityID}
            card
            setValue={props.setValue}
          />

          <SpectrumColorPicker
            value={alphaColor}
            onChange={(c) => {
              let alpha = c.getChannelValue("alpha");
              rep?.mutate.assertFact({
                entity: props.entityID,
                attribute: "theme/card-background-image-opacity",
                data: { type: "number", value: alpha },
              });
            }}
          >
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
          </SpectrumColorPicker>
        </div>
      )}
    </>
  );
};

export const ImageInput = (props: {
  entityID: string;
  onChange?: () => void;
  card?: boolean;
}) => {
  let pageType = useEntity(props.entityID, "page/type")?.data.value;
  let { rep } = useReplicache();
  return (
    <input
      type="file"
      accept="image/*"
      onChange={async (e) => {
        let file = e.currentTarget.files?.[0];
        if (!file || !rep) return;

        await addImage(file, rep, {
          entityID: props.entityID,
          attribute: props.card
            ? "theme/card-background-image"
            : "theme/background-image",
        });
        props.onChange?.();

        if (pageType === "canvas") {
          rep &&
            rep.mutate.assertFact({
              entity: props.entityID,
              attribute: "canvas/background-pattern",
              data: { type: "canvas-pattern-union", value: "plain" },
            });
        }
      }}
    />
  );
};

export const ImageSettings = (props: {
  entityID: string;
  card?: boolean;
  setValue: (c: Color) => void;
}) => {
  let image = useEntity(
    props.entityID,
    props.card ? "theme/card-background-image" : "theme/background-image",
  );
  let repeat = useEntity(
    props.entityID,
    props.card
      ? "theme/card-background-image-repeat"
      : "theme/background-image-repeat",
  );
  let pageType = useEntity(props.entityID, "page/type")?.data.value;
  let { rep } = useReplicache();
  return (
    <>
      <div
        style={{
          backgroundImage: `url(${image?.data.src})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
        className="themeBGImagePreview flex gap-2 place-items-center justify-center w-full h-[128px]  bg-cover bg-center bg-no-repeat"
      >
        <label className="hover:cursor-pointer ">
          <div
            className="flex gap-2 rounded-md px-2 py-1 text-accent-contrast font-bold"
            style={{ backgroundColor: "rgba(var(--bg-page), .6" }}
          >
            <BlockImageSmall /> Change Image
          </div>
          <div className="hidden">
            <ImageInput {...props} />
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
        {pageType !== "canvas" && (
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
                if (repeat)
                  await rep?.mutate.retractFact({ factID: repeat.id });
              }}
            />
            <div
              className={`shink-0 grow-0 w-fit border border-accent-1 rounded-md px-1 py-0.5 cursor-pointer ${!repeat ? "bg-accent-1 text-accent-2" : "bg-transparent text-accent-1"}`}
            >
              cover
            </div>
          </label>
        )}
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
                attribute: props.card
                  ? "theme/card-background-image-repeat"
                  : "theme/background-image-repeat",
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
        {(repeat || pageType === "canvas") && (
          <Slider.Root
            className="relative grow flex items-center select-none touch-none w-full h-fit"
            value={[repeat?.data.value || 500]}
            max={3000}
            min={10}
            step={10}
            onValueChange={(value) => {
              rep?.mutate.assertFact({
                entity: props.entityID,
                attribute: props.card
                  ? "theme/card-background-image-repeat"
                  : "theme/background-image-repeat",
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
