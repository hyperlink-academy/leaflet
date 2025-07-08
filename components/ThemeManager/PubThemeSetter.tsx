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

export type ImageState = {
  src: string;
  file?: File;
  repeat: number | null;
};
export const PubThemeSetter = () => {
  let [loading, setLoading] = useState(false);
  let [openPicker, setOpenPicker] = useState<pickers>("null");
  let { data: pub, mutate } = usePublicationData();
  let record = pub?.record as PubLeafletPublication.Record | undefined;
  let [hasPageBackground, setHasPageBackground] = useState(
    !!record?.theme?.showPageBackground,
  );
  let { theme: localPubTheme, setTheme } = useLocalPubTheme(record);
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
        onSubmit={async (e) => {
          e.preventDefault();
          if (!pub) return;
          console.log(image);
          setLoading(true);
          let result = await updatePublicationTheme({
            uri: pub.uri,
            theme: {
              pageBackground: ColorToRGBA(localPubTheme.bgPage),
              showPageBackground: hasPageBackground,
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
        <ButtonSecondary>{loading ? <DotLoader /> : "Update"}</ButtonSecondary>
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
                  hasPageBackground={!!hasPageBackground}
                  setHasPageBackground={setHasPageBackground}
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
                hasPageBackground={hasPageBackground}
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
            <div className="text-sm text-[#8C8C8C]">Page Preview</div>
            <SamplePub pubBGImage={pubBGImage} pubBGRepeat={leafletBGRepeat} />
          </div>
        </div>
      </div>
    </BaseThemeProvider>
  );
};

const SamplePub = (props: {
  pubBGImage: string | null;
  pubBGRepeat: number | null;
}) => {
  let { data: publication } = usePublicationData();
  let record = publication?.record as PubLeafletPublication.Record | null;

  let showPageBackground = record?.theme?.showPageBackground;

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
      className={`bg-bg-leaflet p-3  flex flex-col gap-3 rounded-t-md  border border-border border-b-0 pb-0`}
    >
      <div
        className="sampleContent rounded-md border-border pb-4 px-[6px]"
        style={{
          background: showPageBackground
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
              className="w-5 h-5 rounded-full place-self-center"
            />
          )}

          <div className="text-xs font-bold pt-1 text-accent-contrast">
            {record?.name}
          </div>
          <div className="text-[8px] font-normal text-tertiary">
            {record?.description}
          </div>
          <div className=" flex gap-1 items-center mt-[6px] bg-accent-1 text-accent-2 py-[1px] px-[4px] text-[8px] w-fit font-bold rounded-[3px] mx-auto">
            <div className="h-2 w-2 rounded-full bg-accent-2" />
            Subscribe with Bluesky
          </div>
        </div>

        <div className="flex flex-col text-[8px] py-1  pt-1 px-[6px] rounded-md ">
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
