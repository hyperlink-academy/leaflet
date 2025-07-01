import { usePublicationData } from "app/lish/[did]/[publication]/dashboard/PublicationSWRProvider";
import { useState } from "react";
import { pickers, SectionArrow } from "./ThemeSetter";
import { theme } from "tailwind.config";
import { PageTextPicker } from "./Pickers/PageThemePickers";
import { Color, ColorSwatch } from "react-aria-components";
import {
  PubLeafletPublication,
  PubLeafletThemeBackgroundImage,
} from "lexicons/api";
import { AtUri } from "@atproto/syntax";
import { useLocalPubTheme } from "./PublicationThemeProvider";
import { BaseThemeProvider } from "./ThemeProvider";
import { BlockImageSmall } from "components/Icons/BlockImageSmall";
import { ColorPicker } from "./Pickers/ColorPicker";
import { CloseContrastSmall } from "components/Icons/CloseContrastSmall";
import * as Slider from "@radix-ui/react-slider";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { ButtonSecondary } from "components/Buttons";
import { updatePublicationTheme } from "app/lish/createPub/updatePublication";

type ImageState = {
  src: string;
  file?: File;
  repeat: number | null;
};
export const PubThemeSetter = () => {
  let [openPicker, setOpenPicker] = useState<pickers>("null");
  let { data: pub, mutate } = usePublicationData();
  let record = pub?.record as PubLeafletPublication.Record | undefined;
  let { theme: localPubTheme, setTheme } = useLocalPubTheme(record);
  let [image, setImage] = useState<ImageState | null>(
    PubLeafletThemeBackgroundImage.isMain(record?.theme?.background)
      ? {
          src: blobRefToSrc(
            record.theme.background.image.ref,
            pub?.identity_did!,
          ),
          repeat: record.theme.background.repeat
            ? record.theme.background.width || 500
            : null,
        }
      : null,
  );

  let pubBGImage = image?.src || null;
  let leafletBGRepeat = image?.repeat || null;

  return (
    <BaseThemeProvider local {...localPubTheme}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!pub) return;

          console.log(ColorToRGB(localPubTheme.accent1));
          let result = await updatePublicationTheme({
            uri: pub.uri,
            theme: {
              page: ColorToRGB(localPubTheme.bgPage),
              backgroundColor: ColorToRGB(localPubTheme.bgLeaflet),
              backgroundRepeat: image?.repeat,
              backgroundImage: image?.file,
              primary: ColorToRGB(localPubTheme.primary),
              accentBackground: ColorToRGB(localPubTheme.accent1),
              accentText: ColorToRGB(localPubTheme.accent2),
            },
          });
          mutate((pub) => {
            if (result?.publication && pub)
              return { ...pub, record: result.publication.record };
            return pub;
          }, false);
        }}
      >
        <ButtonSecondary>Update</ButtonSecondary>
      </form>
      <div>
        <div className="themeSetterContent flex flex-col w-full overflow-y-scroll no-scrollbar">
          <div className="themeBGLeaflet flex">
            <div
              className={`bgPicker flex flex-col gap-0 -mb-[6px] z-10 w-full `}
            >
              <div className="bgPickerBody w-full flex flex-col gap-2 p-2 mt-1 border border-[#CCCCCC] rounded-md text-[#595959] bg-white">
                <BackgroundPicker
                  bgImage={image}
                  setBgImage={setImage}
                  backgroundColor={localPubTheme.bgLeaflet}
                  pageBackgroundColor={localPubTheme.bgPage}
                  setPageBackgroundColor={(color) => {
                    setTheme((t) => ({ ...t, bgPage: color }));
                  }}
                  setBackgroundColor={(color) => {
                    setTheme((t) => ({ ...t, bgLeaflet: color }));
                  }}
                  openPicker={openPicker}
                  setOpenPicker={setOpenPicker}
                />
                <PageTextPicker
                  value={localPubTheme.primary}
                  setValue={(color) => {
                    setTheme((t) => ({ ...t, primary: color }));
                  }}
                  openPicker={openPicker}
                  setOpenPicker={setOpenPicker}
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
            style={{
              backgroundImage: pubBGImage ? `url(${pubBGImage})` : undefined,
              backgroundRepeat: leafletBGRepeat ? "repeat" : "no-repeat",
              backgroundPosition: "center",
              backgroundSize: !leafletBGRepeat
                ? "cover"
                : `calc(${leafletBGRepeat}px / 2 )`,
            }}
            className={`bg-bg-leaflet p-3 flex flex-col rounded-md  border border-border `}
          >
            <div className={`flex flex-col z-10 mt-2 -mb-[6px] `}>
              <AccentPickers
                accent1={localPubTheme.accent1}
                setAccent1={(color) => {
                  setTheme((t) => ({ ...t, accent1: color }));
                }}
                accent2={localPubTheme.accent2}
                setAccent2={(color) => {
                  setTheme((t) => ({ ...t, accent2: color }));
                }}
                openPicker={openPicker}
                setOpenPicker={(pickers) => setOpenPicker(pickers)}
              />
              <SectionArrow
                fill={theme.colors["accent-2"]}
                stroke={theme.colors["accent-1"]}
                className="ml-2"
              />
            </div>

            <SampleButton />
          </div>
          <div className="flex flex-col mt-4 ">
            <div className="text-sm text-[#8C8C8C]">Page Preview</div>
            <SamplePage pubBGImage={pubBGImage} pubBGRepeat={leafletBGRepeat} />
          </div>
        </div>
      </div>
    </BaseThemeProvider>
  );
};

const SamplePage = (props: {
  pubBGImage: string | null;
  pubBGRepeat: number | null;
}) => {
  let { data: publication } = usePublicationData();
  let record = publication?.record as PubLeafletPublication.Record | null;
  return (
    <div
      style={{
        backgroundImage: props.pubBGImage
          ? `url(${props.pubBGImage})`
          : undefined,
        backgroundRepeat: props.pubBGRepeat ? "repeat" : "no-repeat",
        backgroundPosition: "center",
        backgroundSize: !props.pubBGRepeat
          ? "cover"
          : `calc(${props.pubBGRepeat}px / 2 )`,
      }}
      className={`bg-bg-leaflet p-3  flex flex-col gap-3 rounded-t-md  border border-border border-b-0 pb-4`}
    >
      <div className="flex flex-col justify-center text-center pt-1">
        {record?.icon && publication?.uri && (
          <div
            style={{
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: "cover",
              backgroundImage: `url(/api/atproto_images?did=${new AtUri(publication.uri).host}&cid=${(record.icon?.ref as unknown as { $link: string })["$link"]})`,
            }}
            className="w-5 h-5 rounded-full place-self-center"
          />
        )}
        <div className="text-xs font-bold text-accent-contrast pt-1">
          {record?.name}
        </div>
        <div className="text-[8px] font-normal text-tertiary">
          {record?.description}
        </div>
      </div>
      <div className="flex flex-col text-[8px] py-1 px-[6px] rounded-md bg-bg-page">
        <div className="font-bold">A Sample Post</div>
        <div className="text-secondary italic">
          This is a sample description about the sample post
        </div>
      </div>
    </div>
  );
};

function SampleButton() {
  return (
    <div className="w-full py-2 bg-accent-1 text-accent-2 font-bold text-lg text-center rounded-lg">
      Sample Button
    </div>
  );
}

const BackgroundPicker = (props: {
  backgroundColor: Color;
  setBackgroundColor: (c: Color) => void;
  pageBackgroundColor: Color;
  setPageBackgroundColor: (c: Color) => void;
  openPicker: pickers;
  setOpenPicker: (p: pickers) => void;
  bgImage: ImageState | null;
  setBgImage: (i: ImageState | null) => void;
}) => {
  return (
    <>
      {/* if there is a BG image set, show the BG picker stuff */}
      {props.bgImage && props.bgImage !== null && (
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
      )}
      {/* background color picker (we also have page background set to whatever this color is)*/}
      <div className="relative">
        <ColorPicker
          label={
            props.bgImage && props.bgImage !== null
              ? "Containers"
              : "Background"
          }
          value={props.backgroundColor}
          setValue={props.setBackgroundColor}
          thisPicker={"page"}
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
          className="flex gap-2 items-center disabled:text-tertiary"
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
          <strong className={` text-[#595959]`}>BG Image</strong>
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

function ColorToRGB(color: Color) {
  if (!color) return { r: 0, g: 0, b: 0 };
  let c = color.toFormat("rgb");
  const r = c.getChannelValue("red");
  const g = c.getChannelValue("green");
  const b = c.getChannelValue("blue");
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

export const AccentPickers = (props: {
  accent1: Color;
  accent2: Color;
  setAccent1: (color: Color) => void;
  setAccent2: (color: Color) => void;
  openPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
}) => {
  return (
    <>
      <div
        className="themeLeafletControls text-accent-2 flex flex-col gap-2 h-full  bg-bg-leaflet p-2 rounded-md border border-accent-2 shadow-[0_0_0_1px_rgb(var(--accent-1))]"
        style={{
          backgroundColor: "rgba(var(--accent-1), 0.5)",
        }}
      >
        <ColorPicker
          label="Accent"
          value={props.accent1}
          setValue={props.setAccent1}
          thisPicker={"accent-1"}
          openPicker={props.openPicker}
          setOpenPicker={props.setOpenPicker}
          closePicker={() => props.setOpenPicker("null")}
        />
        <ColorPicker
          label="Text on Accent"
          value={props.accent2}
          setValue={props.setAccent2}
          thisPicker={"accent-2"}
          openPicker={props.openPicker}
          setOpenPicker={props.setOpenPicker}
          closePicker={() => props.setOpenPicker("null")}
        />
      </div>
    </>
  );
};
