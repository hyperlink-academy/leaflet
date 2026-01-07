import { pickers } from "../ThemeSetter";
import { theme } from "tailwind.config";
import { PageBackgroundColorPicker } from "../Pickers/PageThemePickers";
import { Color, ColorSwatch } from "react-aria-components";
import { BlockImageSmall } from "components/Icons/BlockImageSmall";
import { ColorPicker } from "../Pickers/ColorPicker";
import { CloseContrastSmall } from "components/Icons/CloseContrastSmall";
import * as Slider from "@radix-ui/react-slider";
import { Toggle } from "components/Toggle";
import { DeleteSmall } from "components/Icons/DeleteSmall";
import { ImageState } from "../PubThemeSetter";
import { Radio } from "components/Checkbox";
import { Input } from "components/Input";

export const BackgroundPicker = (props: {
  backgroundColor: Color;
  setBackgroundColor: (c: Color) => void;
  pageBackground: Color;
  setPageBackground: (c: Color) => void;
  openPicker: pickers;
  setOpenPicker: (p: pickers) => void;
  bgImage: ImageState | null;
  setBgImage: (i: ImageState | null) => void;
  hasPageBackground: boolean;
  setHasPageBackground: (s: boolean) => void;
}) => {
  // When showPageBackground is false (hasPageBackground=false) and no background image, show leafletBg picker
  let showLeafletBgPicker = !props.hasPageBackground && !props.bgImage;

  return (
    <>
      {props.bgImage && props.bgImage !== null ? (
        <BackgroundImagePicker
          bgColor={props.backgroundColor}
          bgImage={props.bgImage}
          setBgImage={props.setBgImage}
          thisPicker={"page-background-image"}
          openPicker={props.openPicker}
          setOpenPicker={props.setOpenPicker}
          closePicker={() => props.setOpenPicker("null")}
          setValue={props.setBackgroundColor}
        />
      ) : (
        <div className="relative">
          <ColorPicker
            label={"Background"}
            value={props.backgroundColor}
            setValue={props.setBackgroundColor}
            thisPicker={"leaflet"}
            openPicker={props.openPicker}
            setOpenPicker={props.setOpenPicker}
            closePicker={() => props.setOpenPicker("null")}
            alpha={!!props.bgImage}
          />
          {!props.bgImage && (
            <label
              className={`
              text-[#969696] hover:cursor-pointer  shrink-0
              absolute top-0 right-0
            `}
            >
              <BlockImageSmall />
              <div className="hidden">
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    let file = e.currentTarget.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        props.setBgImage({
                          src: e.target?.result as string,
                          file,
                          repeat: null,
                        });
                        props.setOpenPicker("page-background-image");
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </label>
          )}
        </div>
      )}
      {!showLeafletBgPicker && (
        // When there's a background image and page background hidden, label should say "Containers"
        <PageBackgroundColorPicker
          label={props.hasPageBackground ? "Page" : "Containers"}
          helpText={
            props.hasPageBackground
              ? undefined
              : "Affects menus, tooltips and some block backgrounds"
          }
          value={props.pageBackground}
          setValue={props.setPageBackground}
          thisPicker={"page"}
          openPicker={props.openPicker}
          setOpenPicker={props.setOpenPicker}
          alpha={props.hasPageBackground ? true : false}
        />
      )}
      <hr className="border-border-light" />
      <div className="flex gap-2 items-center">
        <Toggle
          toggle={props.hasPageBackground}
          onToggle={() => {
            props.setHasPageBackground(!props.hasPageBackground);
            props.hasPageBackground &&
              props.openPicker === "page" &&
              props.setOpenPicker("null");
          }}
          disabledColor1="#8C8C8C"
          disabledColor2="#DBDBDB"
        >
          <div className="flex gap-2">
            <div className="font-bold">Page Background</div>
            <div className="italic text-[#8C8C8C]">
              {props.hasPageBackground ? "" : "none"}
            </div>
          </div>
        </Toggle>
      </div>
    </>
  );
};

const BackgroundImagePicker = (props: {
  disabled?: boolean;
  bgImage: ImageState | null;
  setBgImage: (i: ImageState | null) => void;
  bgColor: Color;
  openPicker: pickers;
  thisPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
  closePicker: () => void;
  setValue: (c: Color) => void;
}) => {
  let open = props.openPicker == props.thisPicker;

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
          className="flex gap-2 items-center disabled:text-tertiary grow"
        >
          <ColorSwatch
            color={props.bgColor}
            className={`w-6 h-6 rounded-full border-2 border-white shadow-[0_0_0_1px_#8C8C8C] ${props.disabled ? "opacity-50" : ""}`}
            style={{
              backgroundImage: props.bgImage
                ? `url(${props.bgImage.src})`
                : undefined,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          />
          <strong className={` text-[#595959]`}>Background</strong>
          <div className="italic text-[#8C8C8C]">image</div>
        </button>
        <div className="flex gap-1 text-[#8C8C8C]">
          <button onClick={() => props.setBgImage(null)}>
            <DeleteSmall />
          </button>
          <label className="hover:cursor-pointer ">
            <BlockImageSmall />
            <div className="hidden">
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  let file = e.currentTarget.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      if (!props.bgImage) return;
                      props.setBgImage({
                        ...props.bgImage,
                        src: e.target?.result as string,
                        file,
                      });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
          </label>
        </div>
      </div>
      {open && (
        <div className="pageImagePicker flex flex-col gap-2">
          <ImageSettings
            bgImage={props.bgImage}
            setBgImage={props.setBgImage}
          />
        </div>
      )}
    </>
  );
};

export const ImageSettings = (props: {
  bgImage: ImageState | null;
  setBgImage: (i: ImageState | null) => void;
}) => {
  return (
    <>
      <div className="themeBGImageControls font-bold flex flex-col gap-1 items-center px-3">
        <label htmlFor="cover" className="w-full">
          <Radio
            radioCheckedClassName="text-[#595959]!"
            radioEmptyClassName="text-[#969696]!"
            type="radio"
            id="cover"
            name="bg-image-options"
            value="cover"
            checked={!props.bgImage?.repeat}
            onChange={async (e) => {
              if (!e.currentTarget.checked) return;
              if (!props.bgImage) return;
              props.setBgImage({ ...props.bgImage, repeat: null });
            }}
          >
            <div
              className={`w-full cursor-pointer ${!props.bgImage?.repeat ? "text-[#595959]" : " text-[#969696]"}`}
            >
              cover
            </div>
          </Radio>
        </label>
        <label htmlFor="repeat" className="pb-3 w-full">
          <Radio
            type="radio"
            id="repeat"
            name="bg-image-options"
            value="repeat"
            radioCheckedClassName="text-[#595959]!"
            radioEmptyClassName="text-[#969696]!"
            checked={!!props.bgImage?.repeat}
            onChange={async (e) => {
              if (!e.currentTarget.checked) return;
              if (!props.bgImage) return;
              props.setBgImage({ ...props.bgImage, repeat: 500 });
            }}
          >
            <div className="flex flex-col w-full">
              <div className="flex gap-2">
                <div
                  className={`shink-0 grow-0 w-fit z-10 cursor-pointer ${props.bgImage?.repeat ? "text-[#595959]" : " text-[#969696]"}`}
                >
                  repeat
                </div>
                <div
                  className={`flex font-normal ${props.bgImage?.repeat ? "text-[#969696]" : " text-[#C3C3C3]"}`}
                >
                  <Input
                    type="number"
                    className="w-10 text-right appearance-none"
                    max={3000}
                    min={10}
                    value={props.bgImage?.repeat || 500}
                    onChange={(e) => {
                      if (!props.bgImage) return;
                      props.setBgImage({
                        ...props.bgImage,
                        repeat: parseInt(e.currentTarget.value),
                      });
                    }}
                  />{" "}
                  px
                </div>
              </div>
              <Slider.Root
                className={`relative grow flex items-center select-none touch-none w-full h-fit px-1 `}
                value={[props.bgImage?.repeat || 500]}
                max={3000}
                min={10}
                step={10}
                onValueChange={(value) => {
                  if (!props.bgImage) return;
                  props.setBgImage({ ...props.bgImage, repeat: value[0] });
                }}
              >
                <Slider.Track
                  className={`${props.bgImage?.repeat ? "bg-[#595959]" : " bg-[#C3C3C3]"} relative grow rounded-full h-[3px] my-2`}
                ></Slider.Track>
                <Slider.Thumb
                  className={`
                    flex w-4 h-4 rounded-full border-2 border-white cursor-pointer
                    ${props.bgImage?.repeat ? "bg-[#595959]" : " bg-[#C3C3C3] "}
                    ${props.bgImage?.repeat && "shadow-[0_0_0_1px_#8C8C8C,inset_0_0_0_1px_#8C8C8C]"} `}
                  aria-label="Volume"
                />
              </Slider.Root>
            </div>
          </Radio>
        </label>
      </div>
    </>
  );
};
