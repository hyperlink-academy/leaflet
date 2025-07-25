"use client";

import {
  ColorPicker as SpectrumColorPicker,
  parseColor,
  Color,
  ColorThumb,
  ColorSlider,
  Input,
  ColorField,
  SliderTrack,
  ColorSwatch,
} from "react-aria-components";
import { Checkbox } from "components/Checkbox";
import { useMemo, useState } from "react";
import { ReplicacheMutators, useEntity, useReplicache } from "src/replicache";
import { useColorAttribute } from "components/ThemeManager/useColorAttribute";
import { Separator } from "components/Layout";
import { onMouseDown } from "src/utils/iosInputMouseDown";
import { pickers, setColorAttribute } from "../ThemeSetter";
import { ImageInput, ImageSettings } from "./ImagePicker";

import { ColorPicker, thumbStyle } from "./ColorPicker";
import { BlockImageSmall } from "components/Icons/BlockImageSmall";
import { Replicache } from "replicache";
import { CanvasBackgroundPattern } from "components/Canvas";
import { Toggle } from "components/Toggle";
import { DeleteSmall } from "components/Icons/DeleteSmall";

export const PageThemePickers = (props: {
  entityID: string;
  openPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
}) => {
  let { rep } = useReplicache();
  let set = useMemo(() => {
    return setColorAttribute(rep, props.entityID);
  }, [rep, props.entityID]);

  let pageType = useEntity(props.entityID, "page/type")?.data.value || "doc";
  let primaryValue = useColorAttribute(props.entityID, "theme/primary");

  return (
    <div
      className="pageThemeBG flex flex-col gap-2 h-full text-primary bg-bg-leaflet p-2 rounded-md border border-primary shadow-[0_0_0_1px_rgb(var(--bg-page))]"
      style={{ backgroundColor: "rgba(var(--bg-page), 0.6)" }}
    >
      {pageType === "canvas" && (
        <>
          <CanvasBGPatternPicker entityID={props.entityID} rep={rep} />{" "}
          <hr className="border-border-light w-full" />
        </>
      )}
      <PageTextPicker
        value={primaryValue}
        setValue={set("theme/primary")}
        openPicker={props.openPicker}
        setOpenPicker={props.setOpenPicker}
      />
    </div>
  );
};

export const PageBackgroundPicker = (props: {
  entityID: string;
  setValue: (c: Color) => void;
  openPicker: pickers;
  setOpenPicker: (p: pickers) => void;
  home?: boolean;
}) => {
  let pageValue = useColorAttribute(props.entityID, "theme/card-background");
  let pageBGImage = useEntity(props.entityID, "theme/card-background-image");
  let pageBorderHidden = useEntity(props.entityID, "theme/card-border-hidden");

  return (
    <>
      {pageBGImage && pageBGImage !== null && (
        <PageBackgroundImagePicker
          disabled={pageBorderHidden?.data.value}
          entityID={props.entityID}
          thisPicker={"page-background-image"}
          openPicker={props.openPicker}
          setOpenPicker={props.setOpenPicker}
          closePicker={() => props.setOpenPicker("null")}
          setValue={props.setValue}
          home={props.home}
        />
      )}
      <div className="relative">
        <PageBackgroundColorPicker
          label={pageBorderHidden?.data.value ? "Menus" : "Page"}
          value={pageValue}
          setValue={props.setValue}
          thisPicker={"page"}
          openPicker={props.openPicker}
          setOpenPicker={props.setOpenPicker}
          alpha
        />
        {(pageBGImage === null ||
          (!pageBGImage && !pageBorderHidden?.data.value && !props.home)) && (
          <label
            className={`
               hover:cursor-pointer  text-[#969696] shrink-0
              absolute top-0 right-0
            `}
          >
            <BlockImageSmall />
            <div className="hidden">
              <ImageInput
                entityID={props.entityID}
                onChange={() => props.setOpenPicker("page-background-image")}
                card
              />
            </div>
          </label>
        )}
      </div>
    </>
  );
};

export const PageBackgroundColorPicker = (props: {
  disabled?: boolean;
  label: string;
  openPicker: pickers;
  thisPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
  setValue: (c: Color) => void;
  value: Color;
  alpha?: boolean;
}) => {
  return (
    <ColorPicker
      disabled={props.disabled}
      label={props.label}
      value={props.value}
      setValue={props.setValue}
      thisPicker={"page"}
      openPicker={props.openPicker}
      setOpenPicker={props.setOpenPicker}
      closePicker={() => props.setOpenPicker("null")}
      alpha={props.alpha}
    />
  );
};

export const PageBackgroundImagePicker = (props: {
  disabled?: boolean;
  entityID: string;
  openPicker: pickers;
  thisPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
  closePicker: () => void;
  setValue: (c: Color) => void;
  home?: boolean;
}) => {
  let bgImage = useEntity(props.entityID, "theme/card-background-image");
  let bgRepeat = useEntity(
    props.entityID,
    "theme/card-background-image-repeat",
  );
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
          disabled={props.disabled}
          onClick={() => {
            if (props.openPicker === props.thisPicker) {
              props.setOpenPicker("null");
            } else {
              props.setOpenPicker(props.thisPicker);
            }
          }}
          className="flex gap-2 items-center disabled:text-[#969696]"
        >
          <ColorSwatch
            color={bgColor}
            className={`w-6 h-6 rounded-full border-2 border-white shadow-[0_0_0_1px_#8C8C8C] ${props.disabled ? "opacity-50" : ""}`}
            style={{
              backgroundImage: bgImage?.data.src
                ? `url(${bgImage.data.src})`
                : undefined,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          />
          <strong
            className={`${props.disabled ? "text-[#969696]" : " text-[#272727] "}`}
          >
            Page
          </strong>
          <div className="">Image</div>
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
          <Separator classname="!h-4 my-1 !border-[#C3C3C3]" />
          <ColorField className="w-fit pl-[6px]" channel="alpha">
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
              className={`w-[48px] bg-transparent outline-none disabled:text-[#969696]`}
            />
          </ColorField>
        </SpectrumColorPicker>
        <div className="flex gap-1 justify-end grow  text-[#969696]">
          <button
            onClick={() => {
              if (bgImage) rep?.mutate.retractFact({ factID: bgImage.id });
              if (bgRepeat) rep?.mutate.retractFact({ factID: bgRepeat.id });
            }}
          >
            <DeleteSmall />
          </button>
          <label>
            <BlockImageSmall />
            <div className="hidden">
              <ImageInput
                entityID={props.entityID}
                onChange={() => props.setOpenPicker("page-background-image")}
                card
              />
            </div>
          </label>
        </div>
      </div>
      {open && (
        <div className="pageImagePicker flex flex-col gap-2">
          <ImageSettings
            entityID={props.entityID}
            card
            setValue={props.setValue}
          />
          <div className="flex flex-col gap-2 pr-2 pl-8 -mt-2 mb-2">
            <hr className="border-[#DBDBDB]" />
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
                  backgroundImage: `url(/transparent-bg.png)`,
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
        </div>
      )}
    </>
  );
};

const CanvasBGPatternPicker = (props: {
  entityID: string;
  rep: Replicache<ReplicacheMutators> | null;
}) => {
  let selectedPattern = useEntity(props.entityID, "canvas/background-pattern")
    ?.data.value;
  return (
    <div className="flex gap-2 h-8 ">
      <button
        className={`w-full rounded-md bg-bg-page border  ${selectedPattern === "grid" ? "outline outline-tertiary border-tertiary" : "transparent-outline hover:outline-border border-border "}`}
        onMouseDown={() => {
          props.rep &&
            props.rep.mutate.assertFact({
              entity: props.entityID,
              attribute: "canvas/background-pattern",
              data: { type: "canvas-pattern-union", value: "grid" },
            });
        }}
      >
        <CanvasBackgroundPattern pattern="grid" scale={0.5} />
      </button>
      <button
        className={`w-full rounded-md bg-bg-page border  ${selectedPattern === "dot" ? "outline outline-tertiary border-tertiary" : "transparent-outline hover:outline-border border-border "}`}
        onMouseDown={() => {
          props.rep &&
            props.rep.mutate.assertFact({
              entity: props.entityID,
              attribute: "canvas/background-pattern",
              data: { type: "canvas-pattern-union", value: "dot" },
            });
        }}
      >
        <CanvasBackgroundPattern pattern="dot" scale={0.5} />
      </button>
      <button
        className={`w-full rounded-md bg-bg-page border  ${selectedPattern === "plain" ? "outline outline-tertiary border-tertiary" : "transparent-outline hover:outline-border border-border "}`}
        onMouseDown={() => {
          props.rep &&
            props.rep.mutate.assertFact({
              entity: props.entityID,
              attribute: "canvas/background-pattern",
              data: { type: "canvas-pattern-union", value: "plain" },
            });
        }}
      >
        <CanvasBackgroundPattern pattern="plain" />
      </button>
    </div>
  );
};

export const PageTextPicker = (props: {
  openPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
  value: Color;
  setValue: (c: Color) => void;
}) => {
  return (
    <ColorPicker
      label="Text"
      value={props.value}
      setValue={props.setValue}
      thisPicker={"text"}
      openPicker={props.openPicker}
      setOpenPicker={props.setOpenPicker}
      closePicker={() => props.setOpenPicker("null")}
    />
  );
};

export const PageBorderHider = (props: {
  entityID: string;
  setOpenPicker: (p: pickers) => void;
  openPicker: pickers;
}) => {
  let { rep, rootEntity } = useReplicache();
  let rootPageBorderHidden = useEntity(rootEntity, "theme/card-border-hidden");
  let entityPageBorderHidden = useEntity(
    props.entityID,
    "theme/card-border-hidden",
  );
  let pageBorderHidden =
    (entityPageBorderHidden || rootPageBorderHidden)?.data.value || false;

  function handleToggle() {
    rep?.mutate.assertFact({
      entity: props.entityID,
      attribute: "theme/card-border-hidden",
      data: { type: "boolean", value: !pageBorderHidden },
    });

    (pageBorderHidden && props.openPicker === "page") ||
      (props.openPicker === "page-background-image" &&
        props.setOpenPicker("null"));
  }

  return (
    <>
      <div className="flex gap-2 items-center">
        <Toggle
          toggleOn={!pageBorderHidden}
          setToggleOn={() => {
            handleToggle();
          }}
          disabledColor1="#8C8C8C"
          disabledColor2="#DBDBDB"
        />
        <button
          className="flex gap-2 items-center"
          onClick={() => {
            handleToggle();
          }}
        >
          <div className="font-bold">Page Background</div>
          <div className="italic text-[#8C8C8C]">
            {pageBorderHidden ? "hidden" : ""}
          </div>
        </button>
      </div>
    </>
  );
};
