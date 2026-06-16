import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "app/(app)/lish/[did]/[publication]/dashboard/PublicationSWRProvider";
import { useState } from "react";
import type { Color } from "react-aria-components";
import { pickers, SectionArrow } from "./ThemeSetter";
import { PubLeafletThemeBackgroundImage } from "lexicons/api";
import { AtUri } from "@atproto/syntax";
import { useLocalPubTheme } from "./PublicationThemeProvider";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { updatePublicationTheme } from "app/(app)/lish/createPub/updatePublication";
import { PagePickers } from "./PubPickers/PubTextPickers";
import { BackgroundPicker } from "./PubPickers/PubBackgroundPickers";
import { PubAccentPickers } from "./PubPickers/PubAcccentPickers";

import { ColorToRGB, ColorToRGBA } from "./colorToLexicons";
import { useToaster } from "components/Toast";
import { OAuthErrorMessage, isOAuthSessionError } from "components/OAuthError";
import { PubPageWidthSetter } from "./PubPickers/PubPageWidthSetter";
import { FontPicker } from "./Pickers/TextPickers";
import { PresetThemePicker } from "./PubPickers/PubPresetPicker";

export type ImageState = {
  src: string;
  file?: File;
  repeat: number | null;
};

export type PubThemeColorSet = {
  bgLeaflet: Color;
  bgPage: Color;
  primary: Color;
  accent1: Color;
  accent2: Color;
};

// The state PubThemePickerPanel needs; implemented by usePubThemeEditorState
// (React state + explicit save) and useDraftPubThemeState (draft leaflet facts).
export type PubThemePanelState = {
  openPicker: pickers;
  setOpenPicker: (p: pickers) => void;
  showPageBackground: boolean;
  setShowPageBackground: (s: boolean) => void;
  localPubTheme: PubThemeColorSet & {
    highlight1?: string;
    highlight2: Color;
    highlight3: Color;
    showPageBackground?: boolean;
    pageWidth?: number;
    headingFontId?: string;
    bodyFontId?: string;
  };
  setTheme: (
    action:
      | Partial<PubThemeColorSet>
      | ((t: Partial<PubThemeColorSet>) => Partial<PubThemeColorSet>),
  ) => void;
  image: ImageState | null;
  setImage: (i: ImageState | null) => void;
  pageWidth: number;
  setPageWidth: (w: number) => void;
  headingFont: string | undefined;
  setHeadingFont: (f: string | undefined) => void;
  bodyFont: string | undefined;
  setBodyFont: (f: string | undefined) => void;
  pubBGImage: string | null;
  leafletBGRepeat: number | null;
  // Reset the draft theme back to the published theme; only the draft-leaflet
  // editor supports this (the legacy editor discards local edits on its own).
  resetTheme?: () => void;
};

export function usePubThemeEditorState() {
  let [openPicker, setOpenPicker] = useState<pickers>("null");
  let { data, mutate } = usePublicationData();
  let { publication: pub } = data || {};
  let record = useNormalizedPublicationRecord();
  let [showPageBackground, setShowPageBackground] = useState(
    !!record?.theme?.showPageBackground,
  );
  let {
    theme: localPubTheme,
    setTheme,
    changes,
    resetChanges,
  } = useLocalPubTheme(record?.theme, showPageBackground);
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
  let [pageWidth, setPageWidth] = useState<number>(
    record?.theme?.pageWidth || 624,
  );
  let [headingFont, setHeadingFont] = useState<string | undefined>(
    record?.theme?.headingFont,
  );
  let [bodyFont, setBodyFont] = useState<string | undefined>(
    record?.theme?.bodyFont,
  );
  let pubBGImage = image?.src || null;
  let leafletBGRepeat = image?.repeat || null;
  let toaster = useToaster();

  let submitTheme = async (setLoading: (l: boolean) => void) => {
    if (!pub) return;
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
        pageWidth: pageWidth,
        primary: ColorToRGB(localPubTheme.primary),
        accentBackground: ColorToRGB(localPubTheme.accent1),
        accentText: ColorToRGB(localPubTheme.accent2),
        headingFont: headingFont,
        bodyFont: bodyFont,
      },
    });

    if (!result.success) {
      setLoading(false);
      if (result.error && isOAuthSessionError(result.error)) {
        toaster({
          content: <OAuthErrorMessage error={result.error} />,
          type: "error",
        });
      } else {
        toaster({
          content: "Something went wrong. Please try again!",
          type: "error",
        });
      }
      return result;
    }

    mutate((pub) => {
      if (result.publication && pub?.publication)
        return {
          ...pub,
          publication: { ...pub.publication, ...result.publication },
        };
      return pub;
    }, false);
    resetChanges();
    setLoading(false);
    return result;
  };

  return {
    openPicker,
    setOpenPicker,
    pub,
    record,
    mutate,
    showPageBackground,
    setShowPageBackground,
    localPubTheme,
    setTheme,
    changes,
    resetChanges,
    image,
    setImage,
    pageWidth,
    setPageWidth,
    headingFont,
    setHeadingFont,
    bodyFont,
    setBodyFont,
    pubBGImage,
    leafletBGRepeat,
    toaster,
    submitTheme,
  };
}

export type PubThemeEditorState = ReturnType<typeof usePubThemeEditorState>;

export function PubThemePickerPanel(props: { state: PubThemePanelState }) {
  let {
    openPicker,
    setOpenPicker,
    showPageBackground,
    setShowPageBackground,
    localPubTheme,
    setTheme,
    image,
    setImage,
    pageWidth,
    setPageWidth,
    headingFont,
    setHeadingFont,
    bodyFont,
    setBodyFont,
    pubBGImage,
    leafletBGRepeat,
    resetTheme,
  } = props.state;

  return (
    <div className="themeSetterContent flex flex-col w-full">
      {resetTheme && (
        <button
          type="button"
          onClick={resetTheme}
          className="self-end text-xs text-tertiary hover:text-primary mb-1"
        >
          Reset to Published
        </button>
      )}
      <div className="themeBGLeaflet flex flex-col">
        <div
          className={`themeBgPicker flex flex-col gap-0 -mb-[6px] z-10 w-full `}
        >
          <PresetThemePicker state={props.state} />
          <div className="bgPickerBody w-full flex flex-col gap-2 p-2  border border-[#CCCCCC] rounded-md text-[#595959] bg-white">
            <PubPageWidthSetter
              pageWidth={pageWidth}
              setPageWidth={setPageWidth}
              thisPicker="page-width"
              openPicker={openPicker}
              setOpenPicker={setOpenPicker}
            />
            <hr className="border-[#CCCCCC] my-0.5" />
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
          <div className="bg-bg-page p-2 rounded-md border border-primary shadow-[0_0_0_1px_rgb(var(--bg-page))] flex flex-col gap-1">
            <FontPicker
              label="Heading"
              value={headingFont}
              onChange={setHeadingFont}
            />
            <FontPicker label="Body" value={bodyFont} onChange={setBodyFont} />
          </div>
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
    </div>
  );
}
