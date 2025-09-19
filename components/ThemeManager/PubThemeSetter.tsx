import { usePublicationData } from "app/lish/[did]/[publication]/dashboard/PublicationSWRProvider";
import { useState } from "react";
import { pickers, SectionArrow } from "./ThemeSetter";
import { Color } from "react-aria-components";
import {
  PubLeafletPublication,
  PubLeafletThemeBackgroundImage,
} from "lexicons/api";
import { AtUri } from "@atproto/syntax";
import { useLocalPubTheme } from "./PublicationThemeProvider";
import { BaseThemeProvider } from "./ThemeProvider";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { ButtonSecondary } from "components/Buttons";
import { updatePublicationTheme } from "app/lish/createPub/updatePublication";
import { DotLoader } from "components/utils/DotLoader";
import { PagePickers } from "./PubPickers/PubTextPickers";
import { BackgroundPicker } from "./PubPickers/PubBackgroundPickers";
import { PubAccentPickers } from "./PubPickers/PubAcccentPickers";
import { Separator } from "components/Layout";

export type ImageState = {
  src: string;
  file?: File;
  repeat: number | null;
};
export const PubThemeSetter = () => {
  let [loading, setLoading] = useState(false);
  let [sample, setSample] = useState<"pub" | "post">("pub");
  let [openPicker, setOpenPicker] = useState<pickers>("null");
  let { data, mutate } = usePublicationData();
  let { publication: pub } = data || {};
  let record = pub?.record as PubLeafletPublication.Record | undefined;
  let [showPageBackground, setShowPageBackground] = useState(
    !!record?.theme?.showPageBackground,
  );
  let {
    theme: localPubTheme,
    setTheme,
    changes,
  } = useLocalPubTheme(record, showPageBackground);
  let [image, setImage] = useState<ImageState | null>(
    PubLeafletThemeBackgroundImage.isMain(record?.theme?.backgroundImage)
      ? {
          src: blobRefToSrc(
            record.theme.backgroundImage.image.ref,
            pub?.identity_did!,
          ),
          repeat: record.theme.backgroundImage.repeat
            ? record.theme.backgroundImage.width || 500
            : null,
        }
      : null,
  );

  let pubBGImage = image?.src || null;
  let leafletBGRepeat = image?.repeat || null;

  return (
    <BaseThemeProvider local {...localPubTheme}>
      <form
        className="bg-accent-1 -mx-3 -mt-2  px-3 py-1 mb-1 flex justify-between items-center"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!pub) return;
          console.log(image);
          setLoading(true);
          let result = await updatePublicationTheme({
            uri: pub.uri,
            theme: {
              pageBackground: ColorToRGBA(localPubTheme.bgPage),
              showPageBackground: showPageBackground,
              backgroundColor: image
                ? ColorToRGBA(localPubTheme.bgLeaflet)
                : ColorToRGB(localPubTheme.bgLeaflet),
              backgroundRepeat: image?.repeat,
              backgroundImage: image ? image.file : null,
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
          setLoading(false);
        }}
      >
        <h4 className="text-accent-2">Publication Theme</h4>
        <ButtonSecondary
          compact
          disabled={
            !(
              showPageBackground !== !!record?.theme?.showPageBackground ||
              changes ||
              !!image?.file ||
              record?.theme?.backgroundImage?.width !== image?.repeat
            )
          }
        >
          {loading ? <DotLoader /> : "Update"}
        </ButtonSecondary>
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
                  pageBackground={localPubTheme.bgPage}
                  setPageBackground={(color) => {
                    setTheme((t) => ({ ...t, bgPage: color }));
                  }}
                  setBackgroundColor={(color) => {
                    setTheme((t) => ({ ...t, bgLeaflet: color }));
                  }}
                  openPicker={openPicker}
                  setOpenPicker={setOpenPicker}
                  hasPageBackground={!!showPageBackground}
                  setHasPageBackground={setShowPageBackground}
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
            className={` relative bg-bg-leaflet px-3 py-4 flex flex-col rounded-md  border border-border `}
          >
            <div className={`flex flex-col  gap-3 z-10`}>
              <PagePickers
                pageBackground={localPubTheme.bgPage}
                primary={localPubTheme.primary}
                setPageBackground={(color) => {
                  setTheme((t) => ({ ...t, bgPage: color }));
                }}
                setPrimary={(color) => {
                  setTheme((t) => ({ ...t, primary: color }));
                }}
                openPicker={openPicker}
                setOpenPicker={(pickers) => setOpenPicker(pickers)}
                hasPageBackground={showPageBackground}
              />
              <PubAccentPickers
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
            </div>
          </div>
          <div className="flex flex-col mt-4 ">
            <div className="flex gap-2 items-center text-sm  text-[#8C8C8C]">
              <div className="text-sm">Preview</div>
              <Separator classname="!h-4" />{" "}
              <button
                className={`${sample === "pub" ? "font-bold  text-[#595959]" : ""}`}
                onClick={() => setSample("pub")}
              >
                Pub
              </button>
              <button
                className={`${sample === "post" ? "font-bold  text-[#595959]" : ""}`}
                onClick={() => setSample("post")}
              >
                Post
              </button>
            </div>
            {sample === "pub" ? (
              <SamplePub
                pubBGImage={pubBGImage}
                pubBGRepeat={leafletBGRepeat}
                showPageBackground={showPageBackground}
              />
            ) : (
              <SamplePost
                pubBGImage={pubBGImage}
                pubBGRepeat={leafletBGRepeat}
                showPageBackground={showPageBackground}
              />
            )}
          </div>
        </div>
      </div>
    </BaseThemeProvider>
  );
};

const SamplePub = (props: {
  pubBGImage: string | null;
  pubBGRepeat: number | null;
  showPageBackground: boolean;
}) => {
  let { data } = usePublicationData();
  let { publication } = data || {};
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
      className={`bg-bg-leaflet p-3 pb-0 flex flex-col gap-3 rounded-t-md  border border-border border-b-0 h-[148px] overflow-hidden `}
    >
      <div
        className="sampleContent rounded-t-md border-border pb-4 px-[10px] flex flex-col gap-[14px] w-[250px] mx-auto"
        style={{
          background: props.showPageBackground
            ? "rgba(var(--bg-page), var(--bg-page-alpha))"
            : undefined,
        }}
      >
        <div className="flex flex-col justify-center text-center pt-2">
          {record?.icon && publication?.uri && (
            <div
              style={{
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: "cover",
                backgroundImage: `url(/api/atproto_images?did=${new AtUri(publication.uri).host}&cid=${(record.icon?.ref as unknown as { $link: string })["$link"]})`,
              }}
              className="w-4 h-4 rounded-full place-self-center"
            />
          )}

          <div className="text-[11px] font-bold pt-[5px] text-accent-contrast">
            {record?.name}
          </div>
          <div className="text-[7px] font-normal text-tertiary">
            {record?.description}
          </div>
          <div className=" flex gap-1 items-center mt-[6px] bg-accent-1 text-accent-2 py-[1px] px-[4px] text-[7px] w-fit font-bold rounded-[2px] mx-auto">
            <div className="h-[7px] w-[7px] rounded-full bg-accent-2" />
            Subscribe with Bluesky
          </div>
        </div>

        <div className="flex flex-col text-[8px]  rounded-md ">
          <div className="font-bold">A Sample Post</div>
          <div className="text-secondary italic text-[6px]">
            This is a sample description about the sample post
          </div>
          <div className="text-tertiary  text-[5px] pt-[2px]">Jan 1, 20XX </div>
        </div>
      </div>
    </div>
  );
};

const SamplePost = (props: {
  pubBGImage: string | null;
  pubBGRepeat: number | null;
  showPageBackground: boolean;
}) => {
  let { data } = usePublicationData();
  let { publication } = data || {};
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
      className={`bg-bg-leaflet p-3 max-w-full flex flex-col gap-3 rounded-t-md  border border-border border-b-0 pb-0 h-[148px] overflow-hidden`}
    >
      <div
        className="sampleContent rounded-t-md border-border pb-0 px-[6px] flex flex-col w-[250px] mx-auto"
        style={{
          background: props.showPageBackground
            ? "rgba(var(--bg-page), var(--bg-page-alpha))"
            : undefined,
        }}
      >
        <div className="flex flex-col ">
          <div className="text-[6px] font-bold pt-[6px] text-accent-contrast">
            {record?.name}
          </div>
          <div className="text-[11px] font-bold text-primary">
            A Sample Post
          </div>
          <div className="text-[7px] font-normal text-secondary italic">
            A short sample description about the sample post
          </div>
          <div className="text-tertiary  text-[5px] pt-[2px]">Jan 1, 20XX </div>
        </div>
        <div className="text-[6px] pt-[8px] flex flex-col gap-[6px]">
          <div>
            Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque
            faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi
            pretium tellus duis convallis. Tempus leo eu aenean sed diam urna
            tempor.
          </div>

          <div>
            Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis
            massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit
            semper vel class aptent taciti sociosqu. Ad litora torquent per
            conubia nostra inceptos himenaeos.
          </div>
          <div>
            Sed et nisi semper, egestas purus a, egestas nulla. Nulla ultricies,
            purus non dapibus tincidunt, nunc sem rhoncus sem, vel malesuada
            tellus enim sit amet magna. Donec ac justo a ipsum fermentum
            vulputate. Etiam sit amet viverra leo. Aenean accumsan consectetur
            velit. Vivamus at justo a nisl imperdiet dictum. Donec scelerisque
            ex eget turpis scelerisque tincidunt. Proin non convallis nibh, eget
            aliquet ex. Curabitur ornare a ipsum in ultrices.
          </div>
        </div>
      </div>
    </div>
  );
};

export function ColorToRGBA(color: Color) {
  if (!color)
    return {
      $type: "pub.leaflet.theme.color#rgba" as const,
      r: 0,
      g: 0,
      b: 0,
      a: 1,
    };
  let c = color.toFormat("rgba");
  const r = c.getChannelValue("red");
  const g = c.getChannelValue("green");
  const b = c.getChannelValue("blue");
  const a = c.getChannelValue("alpha");
  return {
    $type: "pub.leaflet.theme.color#rgba" as const,
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
    a: Math.round(a * 100),
  };
}
function ColorToRGB(color: Color) {
  if (!color)
    return {
      $type: "pub.leaflet.theme.color#rgb" as const,
      r: 0,
      g: 0,
      b: 0,
    };
  let c = color.toFormat("rgb");
  const r = c.getChannelValue("red");
  const g = c.getChannelValue("green");
  const b = c.getChannelValue("blue");
  return {
    $type: "pub.leaflet.theme.color#rgb" as const,
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
  };
}
