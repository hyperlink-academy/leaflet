"use client";

import {
  createContext,
  CSSProperties,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  colorToString,
  useColorAttribute,
  useColorAttributeNullable,
} from "./useColorAttribute";
import { Color as AriaColor, parseColor } from "react-aria-components";
import { parse, contrastLstar, ColorSpace, sRGB } from "colorjs.io/fn";

import { useEntity } from "src/replicache";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { PublicationThemeProvider } from "./PublicationThemeProvider";
import { PubLeafletPublication } from "lexicons/api";

type CSSVariables = {
  "--bg-leaflet": string;
  "--bg-page": string;
  "--primary": string;
  "--accent-1": string;
  "--accent-2": string;
  "--accent-contrast": string;
  "--highlight-1": string;
  "--highlight-2": string;
  "--highlight-3": string;
};

// define the color defaults for everything
export const ThemeDefaults = {
  "theme/page-background": "#F0F7FA",
  "theme/card-background": "#FFFFFF",
  "theme/primary": "#272727",
  "theme/highlight-1": "#FFFFFF",
  "theme/highlight-2": "#EDD280",
  "theme/highlight-3": "#FFCDC3",

  //everywhere else, accent-background = accent-1 and accent-text = accent-2.
  // we just need to create a migration pipeline before we can change this
  "theme/accent-text": "#FFFFFF",
  "theme/accent-background": "#0000FF",
  "theme/accent-contrast": "#0000FF",
};

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
}) {
  let { data: pub } = useLeafletPublicationData();
  if (!pub) return <LeafletThemeProvider {...props} />;
  return (
    <PublicationThemeProvider
      {...props}
      record={pub.publications?.record as PubLeafletPublication.Record}
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
  let primary = useColorAttribute(props.entityID, "theme/primary");

  let highlight1 = useEntity(props.entityID, "theme/highlight-1");
  let highlight2 = useColorAttribute(props.entityID, "theme/highlight-2");
  let highlight3 = useColorAttribute(props.entityID, "theme/highlight-3");

  let accent1 = useColorAttribute(props.entityID, "theme/accent-background");
  let accent2 = useColorAttribute(props.entityID, "theme/accent-text");
  // set accent contrast to the accent color that has the highest contrast with the page background
  let accentContrast = [accent1, accent2].sort((a, b) => {
    return (
      getColorContrast(colorToString(b, "rgb"), colorToString(bgPage, "rgb")) -
      getColorContrast(colorToString(a, "rgb"), colorToString(bgPage, "rgb"))
    );
  })[0];

  return (
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
      accentContrast={accentContrast}
    >
      {props.children}
    </BaseThemeProvider>
  );
}

// handles setting all the Aria Color values to CSS Variables and wrapping the page the theme providers
export const BaseThemeProvider = ({
  local,
  bgLeaflet,
  bgPage,
  primary,
  accent1,
  accent2,
  accentContrast,
  highlight1,
  highlight2,
  highlight3,
  children,
}: {
  local?: boolean;
  bgLeaflet: AriaColor;
  bgPage: AriaColor;
  primary: AriaColor;
  accent1: AriaColor;
  accent2: AriaColor;
  accentContrast: AriaColor;
  highlight1?: string;
  highlight2: AriaColor;
  highlight3: AriaColor;
  children: React.ReactNode;
}) => {
  useEffect(() => {
    if (local) return;
    let el = document.querySelector(":root") as HTMLElement;
    if (!el) return;
    setCSSVariableToColor(el, "--bg-leaflet", bgLeaflet);
    setCSSVariableToColor(el, "--bg-page", bgPage);
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
            getColorContrast(
              colorToString(b, "rgb"),
              colorToString(bgPage, "rgb"),
            ) -
            getColorContrast(
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
  let backgroundImage = useEntity(props.entityID, "theme/background-image");
  let backgroundImageRepeat = useEntity(
    props.entityID,
    "theme/background-image-repeat",
  );
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

// used to calculate the contrast between page and accent1, accent2, and determin which is higher contrast
export function getColorContrast(color1: string, color2: string) {
  ColorSpace.register(sRGB);

  let parsedColor1 = parse(`rgb(${color1})`);
  let parsedColor2 = parse(`rgb(${color2})`);

  return contrastLstar(parsedColor1, parsedColor2);
}
