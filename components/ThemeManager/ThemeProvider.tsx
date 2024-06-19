"use client";

import { CSSProperties, useEffect } from "react";
import { colorToString, useColorAttribute } from "./useColorAttribute";
import { Color } from "react-aria-components";
import { useEntity } from "src/replicache";

type CSSVariables = {
  "--bg-page": string;
  "--bg-card": string;
  "--primary": string;
  "--accent": string;
  "--accent-text": string;
};

export const ThemeDefaults = {
  "theme/page-background": "#F0F7FA",
  "theme/card-background": "#FFFFFF",
  "theme/primary": "#272727",
  "theme/accent-background": "#0000FF",
  "theme/accent-text": "#FFFFFF",
};

function setCSSVariableToColor(el: HTMLElement, name: string, value: Color) {
  el?.style.setProperty(name, colorToString(value));
}
export function ThemeProvider(props: {
  entityID: string;
  children: React.ReactNode;
}) {
  let bgPage = useColorAttribute(props.entityID, "theme/page-background");
  let bgCard = useColorAttribute(props.entityID, "theme/card-background");
  let bgCardAlpha = useEntity(props.entityID, "theme/card-background-alpha");
  let primary = useColorAttribute(props.entityID, "theme/primary");
  let accentBG = useColorAttribute(props.entityID, "theme/accent-background");
  let accentText = useColorAttribute(props.entityID, "theme/accent-text");
  let backgroundImage = useEntity(props.entityID, "theme/background-image");
  let backgroundImageRepeat = useEntity(
    props.entityID,
    "theme/background-image-repeat",
  );
  useEffect(() => {
    let el = document.querySelector(":root") as HTMLElement;
    if (!el) return;
    setCSSVariableToColor(el, "--bg-page", bgPage);
    setCSSVariableToColor(el, "--bg-card", bgCard);
    el?.style.setProperty(
      "--bg-card-alpha",
      (bgCardAlpha?.data.value || 1).toString(),
    );
    setCSSVariableToColor(el, "--primary", primary);
    setCSSVariableToColor(el, "--accent", accentBG);
    setCSSVariableToColor(el, "--accent-text", accentText);
  }, [bgPage, bgCard, primary, accentBG, accentText, bgCardAlpha]);
  return (
    <div
      className="pageWrapper w-full bg-bg-page text-primary h-screen flex flex-col bg-cover bg-center bg-no-repeat items-stretch"
      style={
        {
          backgroundImage: `url(${backgroundImage?.data.src}), url(${backgroundImage?.data.fallback})`,
          backgroundRepeat: backgroundImageRepeat ? "repeat" : "no-repeat",
          backgroundSize: !backgroundImageRepeat
            ? "cover"
            : backgroundImageRepeat?.data.value,
          "--bg-page": colorToString(bgPage),
          "--bg-card": colorToString(bgCard),
          "--bg-card-alpha": bgCardAlpha?.data.value || 1,
          "--primary": colorToString(primary),
          "--accent": colorToString(accentBG),
          "--accent-text": colorToString(accentText),
        } as CSSProperties
      }
    >
      {props.children}
    </div>
  );
}
