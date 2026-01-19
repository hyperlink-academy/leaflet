"use client";

import { createContext, CSSProperties, useContext, useEffect } from "react";

// Context for cardBorderHidden
export const CardBorderHiddenContext = createContext<boolean>(false);

export function useCardBorderHiddenContext() {
  return useContext(CardBorderHiddenContext);
}
import {
  colorToString,
  useColorAttribute,
  useColorAttributeNullable,
} from "./useColorAttribute";
import { Color as AriaColor, parseColor } from "react-aria-components";

import { useEntity } from "src/replicache";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import {
  PublicationBackgroundProvider,
  PublicationThemeProvider,
} from "./PublicationThemeProvider";
import { PubLeafletPublication } from "lexicons/api";
import { getColorDifference } from "./themeUtils";

// define a function to set an Aria Color to a CSS Variable in RGB
function setCSSVariableToColor(
  el: HTMLElement,
  name: string,
  value: AriaColor,
) {
  el?.style.setProperty(name, colorToString(value, "rgb"));
}

//Create a wrapper that applies a theme to each page
export function ThemeProvider(props: {
  entityID: string | null;
  local?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  let { data: pub } = useLeafletPublicationData();
  if (!pub || !pub.publications) return <LeafletThemeProvider {...props} />;
  return (
    <PublicationThemeProvider
      {...props}
      theme={(pub.publications?.record as PubLeafletPublication.Record)?.theme}
      pub_creator={pub.publications?.identity_did}
    />
  );
}
// for PUBLICATIONS: define Aria Colors for each value and use BaseThemeProvider to wrap the content of the page in the theme

// for LEAFLETS : define Aria Colors for each value and use BaseThemeProvider to wrap the content of the page in the theme
export function LeafletThemeProvider(props: {
  entityID: string | null;
  local?: boolean;
  children: React.ReactNode;
}) {
  let bgLeaflet = useColorAttribute(props.entityID, "theme/page-background");
  let bgPage = useColorAttribute(props.entityID, "theme/card-background");
  let cardBorderHiddenValue = useEntity(
    props.entityID,
    "theme/card-border-hidden",
  )?.data.value;
  let showPageBackground = !cardBorderHiddenValue;
  let backgroundImage = useEntity(props.entityID, "theme/background-image");
  let hasBackgroundImage = !!backgroundImage;
  let primary = useColorAttribute(props.entityID, "theme/primary");

  let highlight1 = useEntity(props.entityID, "theme/highlight-1");
  let highlight2 = useColorAttribute(props.entityID, "theme/highlight-2");
  let highlight3 = useColorAttribute(props.entityID, "theme/highlight-3");

  let accent1 = useColorAttribute(props.entityID, "theme/accent-background");
  let accent2 = useColorAttribute(props.entityID, "theme/accent-text");

  let pageWidth = useEntity(props.entityID, "theme/page-width");

  return (
    <CardBorderHiddenContext.Provider value={!!cardBorderHiddenValue}>
      <BaseThemeProvider
        local={props.local}
        bgLeaflet={bgLeaflet}
        bgPage={bgPage}
        primary={primary}
        highlight2={highlight2}
        highlight3={highlight3}
        highlight1={highlight1?.data.value}
        accent1={accent1}
        accent2={accent2}
        showPageBackground={showPageBackground}
        pageWidth={pageWidth?.data.value}
        hasBackgroundImage={hasBackgroundImage}
      >
        {props.children}
      </BaseThemeProvider>
    </CardBorderHiddenContext.Provider>
  );
}

// handles setting all the Aria Color values to CSS Variables and wrapping the page the theme providers
export const BaseThemeProvider = ({
  local,
  bgLeaflet,
  bgPage: bgPageProp,
  primary,
  accent1,
  accent2,
  highlight1,
  highlight2,
  highlight3,
  showPageBackground,
  pageWidth,
  hasBackgroundImage,
  children,
}: {
  local?: boolean;
  showPageBackground?: boolean;
  hasBackgroundImage?: boolean;
  bgLeaflet: AriaColor;
  bgPage: AriaColor;
  primary: AriaColor;
  accent1: AriaColor;
  accent2: AriaColor;
  highlight1?: string;
  highlight2: AriaColor;
  highlight3: AriaColor;
  pageWidth?: number;
  children: React.ReactNode;
}) => {
  // When showPageBackground is false and there's no background image,
  // pageBg should inherit from leafletBg
  const bgPage =
    !showPageBackground && !hasBackgroundImage ? bgLeaflet : bgPageProp;

  let accentContrast;
  let sortedAccents = [accent1, accent2].sort((a, b) => {
    // sort accents by contrast against the background
    return (
      getColorDifference(
        colorToString(b, "rgb"),
        colorToString(showPageBackground ? bgPage : bgLeaflet, "rgb"),
      ) -
      getColorDifference(
        colorToString(a, "rgb"),
        colorToString(showPageBackground ? bgPage : bgLeaflet, "rgb"),
      )
    );
  });
  if (
    // if the contrast-y accent is too similar to text color
    getColorDifference(
      colorToString(sortedAccents[0], "rgb"),
      colorToString(primary, "rgb"),
    ) < 0.15 &&
    // and if the other accent is different enough from the background
    getColorDifference(
      colorToString(sortedAccents[1], "rgb"),
      colorToString(showPageBackground ? bgPage : bgLeaflet, "rgb"),
    ) > 0.31
  ) {
    //then choose the less contrast-y accent
    accentContrast = sortedAccents[1];
  } else {
    // otherwise, choose the more contrast-y option
    accentContrast = sortedAccents[0];
  }

  useEffect(() => {
    if (local) return;
    let el = document.querySelector(":root") as HTMLElement;
    if (!el) return;
    setCSSVariableToColor(el, "--bg-leaflet", bgLeaflet);
    setCSSVariableToColor(el, "--bg-page", bgPage);
    document.body.style.backgroundColor = `rgb(${colorToString(bgLeaflet, "rgb")})`;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", `rgb(${colorToString(bgLeaflet, "rgb")})`);
    el?.style.setProperty(
      "--bg-page-alpha",
      bgPage.getChannelValue("alpha").toString(),
    );
    setCSSVariableToColor(el, "--primary", primary);

    setCSSVariableToColor(el, "--highlight-2", highlight2);
    setCSSVariableToColor(el, "--highlight-3", highlight3);

    //highlight 1 is special because its default value is a calculated value
    if (highlight1) {
      let color = parseColor(`hsba(${highlight1})`);
      el?.style.setProperty(
        "--highlight-1",
        `rgb(${colorToString(color, "rgb")})`,
      );
    } else {
      el?.style.setProperty(
        "--highlight-1",
        "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 75%)",
      );
    }
    setCSSVariableToColor(el, "--accent-1", accent1);
    setCSSVariableToColor(el, "--accent-2", accent2);
    el?.style.setProperty(
      "--accent-contrast",
      colorToString(accentContrast, "rgb"),
    );
    el?.style.setProperty(
      "--accent-1-is-contrast",
      accentContrast === accent1 ? "1" : "0",
    );

    // Set page width CSS variable
    el?.style.setProperty(
      "--page-width-setting",
      (pageWidth || 624).toString(),
    );
  }, [
    local,
    bgLeaflet,
    bgPage,
    primary,
    highlight1,
    highlight2,
    highlight3,
    accent1,
    accent2,
    accentContrast,
    pageWidth,
  ]);
  return (
    <div
      className="leafletWrapper w-full text-primary h-full min-h-fit flex flex-col bg-center items-stretch "
      style={
        {
          "--bg-leaflet": colorToString(bgLeaflet, "rgb"),
          "--bg-page": colorToString(bgPage, "rgb"),
          "--bg-page-alpha": bgPage.getChannelValue("alpha"),
          "--primary": colorToString(primary, "rgb"),
          "--accent-1": colorToString(accent1, "rgb"),
          "--accent-2": colorToString(accent2, "rgb"),
          "--accent-contrast": colorToString(accentContrast, "rgb"),
          "--accent-1-is-contrast": accentContrast === accent1 ? 1 : 0,
          "--highlight-1": highlight1
            ? `rgb(${colorToString(parseColor(`hsba(${highlight1})`), "rgb")})`
            : "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 75%)",
          "--highlight-2": colorToString(highlight2, "rgb"),
          "--highlight-3": colorToString(highlight3, "rgb"),
          "--page-width-setting": pageWidth || 624,
          "--page-width-unitless": pageWidth || 624,
          "--page-width-units": `min(${pageWidth || 624}px, calc(100vw - 12px))`,
        } as CSSProperties
      }
    >
      {" "}
      {children}{" "}
    </div>
  );
};

let CardThemeProviderContext = createContext<null | string>(null);
export function NestedCardThemeProvider(props: { children: React.ReactNode }) {
  let card = useContext(CardThemeProviderContext);
  if (!card) return props.children;
  return (
    <CardThemeProvider entityID={card}>{props.children}</CardThemeProvider>
  );
}

export function CardThemeProvider(props: {
  entityID: string;
  children: React.ReactNode;
}) {
  let bgPage = useColorAttributeNullable(
    props.entityID,
    "theme/card-background",
  );
  let primary = useColorAttributeNullable(props.entityID, "theme/primary");
  let accent1 = useColorAttributeNullable(
    props.entityID,
    "theme/accent-background",
  );
  let accent2 = useColorAttributeNullable(props.entityID, "theme/accent-text");
  let accentContrast =
    bgPage && accent1 && accent2
      ? [accent1, accent2].sort((a, b) => {
          return (
            getColorDifference(
              colorToString(b, "rgb"),
              colorToString(bgPage, "rgb"),
            ) -
            getColorDifference(
              colorToString(a, "rgb"),
              colorToString(bgPage, "rgb"),
            )
          );
        })[0]
      : null;

  return (
    <CardThemeProviderContext.Provider value={props.entityID}>
      <div
        className="contents text-primary"
        style={
          {
            "--accent-1": accent1 ? colorToString(accent1, "rgb") : undefined,
            "--accent-2": accent2 ? colorToString(accent2, "rgb") : undefined,
            "--accent-contrast": accentContrast
              ? colorToString(accentContrast, "rgb")
              : undefined,
            "--bg-page": bgPage ? colorToString(bgPage, "rgb") : undefined,
            "--bg-page-alpha": bgPage
              ? bgPage.getChannelValue("alpha")
              : undefined,
            "--primary": primary ? colorToString(primary, "rgb") : undefined,
          } as CSSProperties
        }
      >
        {props.children}
      </div>
    </CardThemeProviderContext.Provider>
  );
}

// Wrapper within the Theme Wrapper that provides background image data
export const ThemeBackgroundProvider = (props: {
  entityID: string;
  children: React.ReactNode;
}) => {
  let { data: pub } = useLeafletPublicationData();
  let backgroundImage = useEntity(props.entityID, "theme/background-image");
  let backgroundImageRepeat = useEntity(
    props.entityID,
    "theme/background-image-repeat",
  );
  if (pub?.publications) {
    return (
      <PublicationBackgroundProvider
        pub_creator={pub?.publications.identity_did || ""}
        theme={
          (pub.publications?.record as PubLeafletPublication.Record)?.theme
        }
      >
        {props.children}
      </PublicationBackgroundProvider>
    );
  }
  return (
    <div
      className="LeafletBackgroundWrapper w-full bg-bg-leaflet text-primary h-full flex flex-col bg-cover bg-center bg-no-repeat items-stretch"
      style={
        {
          backgroundImage: backgroundImage
            ? `url(${backgroundImage?.data.src}), url(${backgroundImage?.data.fallback})`
            : undefined,
          backgroundPosition: "center",
          backgroundRepeat: backgroundImageRepeat ? "repeat" : "no-repeat",
          backgroundSize: !backgroundImageRepeat
            ? "cover"
            : backgroundImageRepeat?.data.value,
        } as CSSProperties
      }
    >
      {props.children}
    </div>
  );
};
