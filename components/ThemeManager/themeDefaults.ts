/**
 * Default theme values for publications.
 * Shared between client and server code.
 */

// Hex color defaults
export const PubThemeDefaults = {
  backgroundColor: "#FDFCFA",
  pageBackground: "#FDFCFA",
  primary: "#272727",
  accentText: "#FFFFFF",
  accentBackground: "#0000FF",
} as const;

// RGB color defaults (parsed from hex values above)
export const PubThemeDefaultsRGB = {
  background: { r: 253, g: 252, b: 250 }, // #FDFCFA
  foreground: { r: 39, g: 39, b: 39 }, // #272727
  accent: { r: 0, g: 0, b: 255 }, // #0000FF
  accentForeground: { r: 255, g: 255, b: 255 }, // #FFFFFF
} as const;
