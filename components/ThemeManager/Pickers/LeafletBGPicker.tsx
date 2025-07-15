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
import { pickers, setColorAttribute } from "../ThemeSetter";
import { thumbStyle } from "./ColorPicker";
import { ImageInput, ImageSettings } from "./ImagePicker";
import { useEntity, useReplicache } from "src/replicache";
import { useColorAttribute } from "components/ThemeManager/useColorAttribute";
import { Separator } from "components/Layout";
import { onMouseDown } from "src/utils/iosInputMouseDown";
import { BlockImageSmall } from "components/Icons/BlockImageSmall";
import { DeleteSmall } from "components/Icons/DeleteSmall";

export const LeafletBGPicker = (props: {
  entityID: string;
  openPicker: pickers;
  thisPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
  closePicker: () => void;
  setValue: (c: Color) => void;
}) => {
  let bgImage = useEntity(props.entityID, "theme/background-image");
  let bgRepeat = useEntity(props.entityID, "theme/background-image-repeat");
  let bgColor = useColorAttribute(props.entityID, "theme/page-background");
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
                backgroundImage: bgImage?.data.src
                  ? `url(${bgImage.data.src})`
                  : undefined,
                backgroundSize: "cover",
              }}
            />
            <strong className={` "text-[#595959]`}>{"Background"}</strong>
          </button>

          <div className="flex">
            {bgImage ? (
              <div className={`"text-[#969696]`}>Image</div>
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
                    onPaste={(e) => {
                      console.log(e);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      } else return;
                    }}
                    onBlur={(e) => {
                      props.setValue(parseColor(e.currentTarget.value));
                    }}
                    className={`w-[72px] bg-transparent outline-nonetext-[#595959]`}
                  />
                </ColorField>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-1 justify-end grow text-[#969696]">
          {bgImage && (
            <button
              onClick={() => {
                if (bgImage) rep?.mutate.retractFact({ factID: bgImage.id });
                if (bgRepeat) rep?.mutate.retractFact({ factID: bgRepeat.id });
              }}
            >
              <DeleteSmall />
            </button>
          )}
          <label>
            <BlockImageSmall />
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
      </div>
      {open && (
        <div className="bgImageAndColorPicker w-full flex flex-col gap-2 ">
          <SpectrumColorPicker
            value={bgColor}
            onChange={setColorAttribute(
              rep,
              props.entityID,
            )("theme/page-background")}
          >
            {bgImage ? (
              <ImageSettings
                entityID={props.entityID}
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
          </SpectrumColorPicker>
        </div>
      )}
    </>
  );
};
