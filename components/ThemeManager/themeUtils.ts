import { parse, contrastLstar, ColorSpace, sRGB } from "colorjs.io/fn";

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
  "theme/accent-background": "#0000FF",
  "theme/accent-contrast": "#0000FF",
};

// used to calculate the contrast between page and accent1, accent2, and determin which is higher contrast
export function getColorContrast(color1: string, color2: string) {
  ColorSpace.register(sRGB);

  let parsedColor1 = parse(`rgb(${color1})`);
  let parsedColor2 = parse(`rgb(${color2})`);

  return contrastLstar(parsedColor1, parsedColor2);
}
