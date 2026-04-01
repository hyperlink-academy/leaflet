import { parse, ColorSpace, sRGB, distance, OKLab, to } from "colorjs.io/fn";

// define the color defaults for everything
export const ThemeDefaults = {
  "theme/page-background": "#FDFCFA",
  "theme/card-background": "#FFFFFF",
  "theme/primary": "#272727",
  "theme/highlight-1": "#FFFFFF",
  "theme/highlight-2": "#EDD280",
  "theme/highlight-3": "#FFCDC3",

  //everywhere else, accent-background = accent-1 and accent-text = accent-2.
  // we just need to create a migration pipeline before we can change this
  "theme/accent-text": "#FFFFFF",
  "theme/accent-background": "#57822B",
  "theme/accent-contrast": "#57822B",
};

// Compares two RGB color strings in OKLab space and returns both the overall
// perceptual distance and the chroma (hue/saturation) difference.
//
// Why both? Dark colors are compressed in OKLab lightness, so two colors can
// have a small overall distance yet be clearly distinguishable by hue (e.g.
// dark blue vs black). Checking chromaDiff lets callers tell apart "two
// similar grays" from "a dark chromatic color next to a gray/black".
export function compareColors(color1: string, color2: string) {
  ColorSpace.register(sRGB);
  ColorSpace.register(OKLab);

  let parsedColor1 = parse(`rgb(${color1})`);
  let parsedColor2 = parse(`rgb(${color2})`);

  let [, a1, b1] = to(parsedColor1, "oklab").coords;
  let [, a2, b2] = to(parsedColor2, "oklab").coords;

  return {
    distance: distance(parsedColor1, parsedColor2, "oklab"),
    chromaDiff: Math.sqrt((a1 - a2) ** 2 + (b1 - b2) ** 2),
  };
}
