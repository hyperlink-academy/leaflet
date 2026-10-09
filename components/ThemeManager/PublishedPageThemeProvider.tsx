import type { CSSProperties } from "react";
import { parseColor } from "@react-stately/color";
import type { PubLeafletThemeColor, PubLeafletThemePage } from "lexicons/api";
import { colorToString } from "./useColorAttribute";
import { compareColors } from "./themeUtils";

type LexColor = PubLeafletThemeColor.Rgb | PubLeafletThemeColor.Rgba;

const parse = (c: LexColor | { $type: string } | undefined) => {
  if (!c) return null;
  if (c.$type === "pub.leaflet.theme.color#rgba") {
    let { r, g, b, a } = c as PubLeafletThemeColor.Rgba;
    return parseColor(`rgba(${r}, ${g}, ${b}, ${a / 100})`);
  }
  if (c.$type === "pub.leaflet.theme.color#rgb") {
    let { r, g, b } = c as PubLeafletThemeColor.Rgb;
    return parseColor(`rgb(${r}, ${g}, ${b})`);
  }
  return null;
};

// The published counterpart of CardThemeProvider: a page's own colors
// override the theme for its subtree, and each color it doesn't set falls
// back to the surrounding --leaflet-* variables.
export function PublishedPageThemeProvider(props: {
  theme: PubLeafletThemePage.Main | undefined;
  children: React.ReactNode;
}) {
  if (!props.theme) return <>{props.children}</>;
  let bgPage = parse(props.theme.pageBackground);
  let primary = parse(props.theme.primary);
  let accent1 = parse(props.theme.accentBackground);
  let accent2 = parse(props.theme.accentText);
  let accentContrast =
    bgPage && accent1 && accent2
      ? [accent1, accent2].sort((a, b) => {
          let bgStr = colorToString(bgPage, "rgb");
          return (
            compareColors(colorToString(b, "rgb"), bgStr).distance -
            compareColors(colorToString(a, "rgb"), bgStr).distance
          );
        })[0]
      : null;
  return (
    <div
      className="contents text-primary"
      style={
        {
          "--accent-1": accent1
            ? colorToString(accent1, "rgb")
            : "var(--leaflet-accent-1)",
          "--accent-2": accent2
            ? colorToString(accent2, "rgb")
            : "var(--leaflet-accent-2)",
          "--accent-contrast": accentContrast
            ? colorToString(accentContrast, "rgb")
            : "var(--leaflet-accent-contrast)",
          "--bg-page": bgPage
            ? colorToString(bgPage, "rgb")
            : "var(--leaflet-bg-page)",
          "--bg-page-alpha": bgPage
            ? bgPage.getChannelValue("alpha")
            : "var(--leaflet-bg-page-alpha)",
          "--primary": primary
            ? colorToString(primary, "rgb")
            : "var(--leaflet-primary)",
        } as CSSProperties
      }
    >
      {props.children}
    </div>
  );
}
