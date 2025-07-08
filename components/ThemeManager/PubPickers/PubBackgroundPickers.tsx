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
                        console.log("loaded!", props.bgImage);
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
      <PageBackgroundColorPicker
        label={"Containers"}
        value={props.pageBackground}
        setValue={props.setPageBackground}
        thisPicker={"page"}
        openPicker={props.openPicker}
        setOpenPicker={props.setOpenPicker}
        alpha={props.hasPageBackground ? true : false}
      />
      <hr className="border-border-light" />
      <div className="flex gap-2 items-center">
        <Toggle
          toggleOn={props.hasPageBackground}
          setToggleOn={() => {
            props.setHasPageBackground(!props.hasPageBackground);
            props.hasPageBackground && props.setOpenPicker("null");
          }}
          disabledColor1="#8C8C8C"
          disabledColor2="#DBDBDB"
        />
        <button
          className="flex gap-2 items-center"
          onClick={() => {
            props.setHasPageBackground(!props.hasPageBackground);
            props.hasPageBackground && props.setOpenPicker("null");
          }}
        >
          <div className="font-bold">Page Background</div>
          <div className="italic text-[#8C8C8C]">
            {props.hasPageBackground ? "" : "hidden"}
          </div>
        </button>
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
        <button
          className="text-[#8C8C8C]"
          onClick={() => props.setBgImage(null)}
        >
          <DeleteSmall />
        </button>
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
      <div
        style={{
          backgroundImage: props.bgImage
            ? `url(${props.bgImage.src})`
            : undefined,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
        className="themeBGImagePreview flex gap-2 place-items-center justify-center w-full h-[128px]  bg-cover bg-center bg-no-repeat"
      >
        <label className="hover:cursor-pointer ">
          <div
            className="flex gap-2 rounded-md px-2 py-1 text-accent-contrast font-bold"
            style={{ backgroundColor: "rgba(var(--bg-page), .8" }}
          >
            <BlockImageSmall /> Change Image
          </div>
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
        <button
          onClick={() => {
            props.setBgImage(null);
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
            checked={!props.bgImage?.repeat}
            onChange={async (e) => {
              if (!e.currentTarget.checked) return;
              if (!props.bgImage) return;
              props.setBgImage({ ...props.bgImage, repeat: null });
            }}
          />
          <div
            className={`shink-0 grow-0 w-fit border border-accent-1 rounded-md px-1 py-0.5 cursor-pointer ${!props.bgImage?.repeat ? "bg-accent-1 text-accent-2" : "bg-transparent text-accent-1"}`}
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
            checked={!!props.bgImage?.repeat}
            onChange={async (e) => {
              if (!e.currentTarget.checked) return;
              if (!props.bgImage) return;
              props.setBgImage({ ...props.bgImage, repeat: 500 });
            }}
          />
          <div
            className={`shink-0 grow-0 w-fit z-10 border border-accent-1 rounded-md px-1 py-0.5 cursor-pointer ${props.bgImage?.repeat ? "bg-accent-1 text-accent-2" : "bg-transparent text-accent-1"}`}
          >
            repeat
          </div>
        </label>
        {props.bgImage?.repeat && (
          <Slider.Root
            className="relative grow flex items-center select-none touch-none w-full h-fit"
            value={[props.bgImage?.repeat || 500]}
            max={3000}
            min={10}
            step={10}
            onValueChange={(value) => {
              if (!props.bgImage) return;
              props.setBgImage({ ...props.bgImage, repeat: value[0] });
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
