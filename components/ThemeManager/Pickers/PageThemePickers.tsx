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
      <PageBackgroundPicker
        entityID={props.entityID}
        setValue={set("theme/card-background")}
        openPicker={props.openPicker}
        setOpenPicker={props.setOpenPicker}
      />
      <PageTextPicker
        entityID={props.entityID}
        setValue={set("theme/primary")}
        openPicker={props.openPicker}
        setOpenPicker={props.setOpenPicker}
      />
      <hr className="border-border-light" />
      <PageBorderHider entityID={props.entityID} />
    </div>
  );
};

export const PageBackgroundPicker = (props: {
  entityID: string;
  setValue: (c: Color) => void;
  openPicker: pickers;
  setOpenPicker: (p: pickers) => void;
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
        />
      )}
      <div className="relative">
        <ColorPicker
          disabled={pageBorderHidden?.data.value}
          label={pageBGImage && pageBGImage !== null ? "Menus" : "Page"}
          value={pageValue}
          setValue={props.setValue}
          thisPicker={"page"}
          openPicker={props.openPicker}
          setOpenPicker={props.setOpenPicker}
          closePicker={() => props.setOpenPicker("null")}
          alpha
        />
        {(pageBGImage === null || !pageBGImage) && (
          <label
            className={`
              text-primary hover:cursor-pointer  shrink-0
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

export const PageBackgroundImagePicker = (props: {
  disabled?: boolean;
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
          disabled={props.disabled}
          onClick={() => {
            if (props.openPicker === props.thisPicker) {
              props.setOpenPicker("null");
            } else {
              props.setOpenPicker(props.thisPicker);
            }
          }}
          className="flex gap-2 items-center disabled:text-tertiary"
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
            className={`${props.disabled ? "text-tertiary" : "text-primary "}`}
          >
            BG Image
          </strong>
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
              className={`w-[48px] bg-transparent outline-none disabled:text-tertiary`}
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
  entityID: string;
  openPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
  setValue: (c: Color) => void;
}) => {
  let primaryValue = useColorAttribute(props.entityID, "theme/primary");

  return (
    <ColorPicker
      label="Text"
      value={primaryValue}
      setValue={props.setValue}
      thisPicker={"text"}
      openPicker={props.openPicker}
      setOpenPicker={props.setOpenPicker}
      closePicker={() => props.setOpenPicker("null")}
    />
  );
};

export const PageBorderHider = (props: { entityID: string }) => {
  let { rep, rootEntity } = useReplicache();
  let rootPageBorderHidden = useEntity(rootEntity, "theme/card-border-hidden");
  let entityPageBorderHidden = useEntity(
    props.entityID,
    "theme/card-border-hidden",
  );
  let pageBorderHidden =
    (entityPageBorderHidden || rootPageBorderHidden)?.data.value || false;

  return (
    <>
      <Checkbox
        small
        className="pl-[6px] !gap-3"
        checked={pageBorderHidden}
        onChange={(e) => {
          rep?.mutate.assertFact({
            entity: props.entityID,
            attribute: "theme/card-border-hidden",
            data: { type: "boolean", value: !pageBorderHidden },
          });
        }}
      >
        No Page Borders
      </Checkbox>
    </>
  );
};
