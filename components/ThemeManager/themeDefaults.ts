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
  accentBackground: "#639431",
} as const;

// RGB color defaults (parsed from hex values above)
export const PubThemeDefaultsRGB = {
  background: { r: 253, g: 252, b: 250 }, // #FDFCFA
  foreground: { r: 39, g: 39, b: 39 }, // #272727
  accent: { r: 99, g: 148, b: 49 }, // #639431
  accentForeground: { r: 255, g: 255, b: 255 }, // #FFFFFF
} as const;
