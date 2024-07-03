"use client";

import { CSSProperties, useEffect } from "react";
import { colorToString, useColorAttribute } from "./useColorAttribute";
import { Color, parseColor } from "react-aria-components";
import { useEntity } from "src/replicache";

type CSSVariables = {
  "--bg-page": string;
  "--bg-card": string;
  "--primary": string;
  "--accent": string;
  "--accent-text": string;
  "--highlight-1": string;
  "--highlight-2": string;
  "--highlight-3": string;
};

export const ThemeDefaults = {
  "theme/page-background": "#F0F7FA",
  "theme/card-background": "#FFFFFF",
  "theme/primary": "#272727",
  "theme/accent-background": "#0000FF",
  "theme/accent-text": "#FFFFFF",
  // this is affecting the default set in the Highlight settings. It needs to refelct the caluclated value
  // seems like a pain in the butt tho.
  "theme/highlight-1": "#0000FF",
  "theme/highlight-2": "#EDD280",
  "theme/highlight-3": "#9FC4C2",
};

function setCSSVariableToColor(el: HTMLElement, name: string, value: Color) {
  el?.style.setProperty(name, colorToString(value, "rgb"));
}
export function ThemeProvider(props: {
  entityID: string;
  children: React.ReactNode;
}) {
  let bgPage = useColorAttribute(props.entityID, "theme/page-background");
  let bgCard = useColorAttribute(props.entityID, "theme/card-background");
  let primary = useColorAttribute(props.entityID, "theme/primary");
  let accentBG = useColorAttribute(props.entityID, "theme/accent-background");
  let accentText = useColorAttribute(props.entityID, "theme/accent-text");
  let backgroundImage = useEntity(props.entityID, "theme/background-image");
  let backgroundImageRepeat = useEntity(
    props.entityID,
    "theme/background-image-repeat",
  );
  let highlight1 = useEntity(props.entityID, "theme/highlight-1");
  let highlight2 = useColorAttribute(props.entityID, "theme/highlight-2");
  let highlight3 = useColorAttribute(props.entityID, "theme/highlight-3");

  useEffect(() => {
    let el = document.querySelector(":root") as HTMLElement;
    if (!el) return;
    setCSSVariableToColor(el, "--bg-page", bgPage);
    setCSSVariableToColor(el, "--bg-card", bgCard);
    el?.style.setProperty(
      "--bg-card-alpha",
      bgCard.getChannelValue("alpha").toString(),
    );
    setCSSVariableToColor(el, "--primary", primary);
    setCSSVariableToColor(el, "--accent", accentBG);
    setCSSVariableToColor(el, "--accent-text", accentText);
    setCSSVariableToColor(el, "--highlight-2", highlight2);
    setCSSVariableToColor(el, "--highlight-3", highlight3);

    //highlight 1 is special because its default value is a calculated value
    if (highlight1) {
      let color = parseColor(`hsba(${highlight1.data.value})`);
      el?.style.setProperty(
        "--highlight-1",
        `rgb(${colorToString(color, "rgb")})`,
      );
    } else {
      el?.style.setProperty(
        "--highlight-1",
        "color-mix(in oklab, rgb(var(--primary)), rgb(var(--bg-card)) 75%)",
      );
    }
  }, [
    bgPage,
    bgCard,
    primary,
    accentBG,
    accentText,
    highlight1,
    highlight2,
    highlight3,
  ]);
  return (
    <div
      className="pageWrapper w-full bg-bg-page text-primary h-full flex flex-col bg-cover bg-center bg-no-repeat items-stretch"
      style={
        {
          backgroundImage: `url(${backgroundImage?.data.src}), url(${backgroundImage?.data.fallback})`,
          backgroundRepeat: backgroundImageRepeat ? "repeat" : "no-repeat",
          backgroundSize: !backgroundImageRepeat
            ? "cover"
            : backgroundImageRepeat?.data.value,
          "--bg-page": colorToString(bgPage, "rgb"),
          "--bg-card": colorToString(bgCard, "rgb"),
          "--bg-card-alpha": bgCard.getChannelValue("alpha"),
          "--primary": colorToString(primary, "rgb"),
          "--accent": colorToString(accentBG, "rgb"),
          "--accent-text": colorToString(accentText, "rgb"),
          "--highlight-1": highlight1
            ? `rgb(${colorToString(parseColor(`hsba(${highlight1.data.value})`), "rgb")})`
            : "color-mix(in oklab, rgb(var(--primary)), rgb(var(--bg-card)) 75%)",
          "--highlight-2": colorToString(highlight2, "rgb"),
          "--highlight-3": colorToString(highlight3, "rgb"),
        } as CSSProperties
      }
    >
      {props.children}
    </div>
  );
}
