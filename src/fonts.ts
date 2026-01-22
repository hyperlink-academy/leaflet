// Font configuration for self-hosted and Google Fonts
// This replicates what next/font does but allows dynamic selection per-leaflet

export type FontConfig = {
  id: string;
  displayName: string;
  fontFamily: string;
  fallback: string[];
} & (
  | {
      // Self-hosted fonts with local files
      type: "local";
      files: {
        path: string;
        style: "normal" | "italic";
        weight?: string;
      }[];
    }
  | {
      // Google Fonts loaded via CDN
      type: "google";
      googleFontsFamily: string; // e.g., "Open+Sans:ital,wght@0,400;0,700;1,400;1,700"
    }
  | {
      // System fonts (no loading required)
      type: "system";
    }
);

export const fonts: Record<string, FontConfig> = {
  // Self-hosted variable fonts (WOFF2)
  quattro: {
    id: "quattro",
    displayName: "iA Writer Quattro",
    fontFamily: "iA Writer Quattro V",
    type: "local",
    files: [
      { path: "/fonts/iaw-quattro-vf.woff2", style: "normal", weight: "400 700" },
      { path: "/fonts/iaw-quattro-vf-Italic.woff2", style: "italic", weight: "400 700" },
    ],
    fallback: ["system-ui", "sans-serif"],
  },
  lora: {
    id: "lora",
    displayName: "Lora",
    fontFamily: "Lora",
    type: "local",
    files: [
      { path: "/fonts/Lora-Variable.woff2", style: "normal", weight: "400 700" },
      { path: "/fonts/Lora-Italic-Variable.woff2", style: "italic", weight: "400 700" },
    ],
    fallback: ["Georgia", "serif"],
  },
  "source-sans": {
    id: "source-sans",
    displayName: "Source Sans",
    fontFamily: "Source Sans 3",
    type: "local",
    files: [
      { path: "/fonts/SourceSans3-Variable.woff2", style: "normal", weight: "200 900" },
      { path: "/fonts/SourceSans3-Italic-Variable.woff2", style: "italic", weight: "200 900" },
    ],
    fallback: ["system-ui", "sans-serif"],
  },
  "atkinson-hyperlegible": {
    id: "atkinson-hyperlegible",
    displayName: "Atkinson Hyperlegible",
    fontFamily: "Atkinson Hyperlegible Next",
    type: "local",
    files: [
      { path: "/fonts/AtkinsonHyperlegibleNext-Variable.woff2", style: "normal", weight: "200 800" },
      { path: "/fonts/AtkinsonHyperlegibleNext-Italic-Variable.woff2", style: "italic", weight: "200 800" },
    ],
    fallback: ["system-ui", "sans-serif"],
  },
  "noto-sans": {
    id: "noto-sans",
    displayName: "Noto Sans",
    fontFamily: "Noto Sans",
    type: "local",
    files: [
      { path: "/fonts/NotoSans-Variable.woff2", style: "normal", weight: "100 900" },
      { path: "/fonts/NotoSans-Italic-Variable.woff2", style: "italic", weight: "100 900" },
    ],
    fallback: ["Arial", "sans-serif"],
  },

  // Google Fonts (no variable version available)
  "alegreya-sans": {
    id: "alegreya-sans",
    displayName: "Alegreya Sans",
    fontFamily: "Alegreya Sans",
    type: "google",
    googleFontsFamily: "Alegreya+Sans:ital,wght@0,400;0,700;1,400;1,700",
    fallback: ["system-ui", "sans-serif"],
  },
  "space-mono": {
    id: "space-mono",
    displayName: "Space Mono",
    fontFamily: "Space Mono",
    type: "google",
    googleFontsFamily: "Space+Mono:ital,wght@0,400;0,700;1,400;1,700",
    fallback: ["monospace"],
  },
};

export const defaultFontId = "quattro";

export function getFontConfig(fontId: string | undefined): FontConfig {
  return fonts[fontId || defaultFontId] || fonts[defaultFontId];
}

// Generate @font-face CSS for a local font
export function generateFontFaceCSS(font: FontConfig): string {
  if (font.type !== "local") return "";
  return font.files
    .map((file) => {
      const format = file.path.endsWith(".woff2") ? "woff2" : "truetype";
      return `
@font-face {
  font-family: '${font.fontFamily}';
  src: url('${file.path}') format('${format}');
  font-style: ${file.style};
  font-weight: ${file.weight || "normal"};
  font-display: swap;
}`.trim();
    })
    .join("\n\n");
}

// Generate preload link attributes for a local font
export function getFontPreloadLinks(font: FontConfig): { href: string; type: string }[] {
  if (font.type !== "local") return [];
  return font.files.map((file) => ({
    href: file.path,
    type: file.path.endsWith(".woff2") ? "font/woff2" : "font/ttf",
  }));
}

// Get Google Fonts URL for a font
// Using display=swap per Google's recommendation: shows fallback immediately, swaps when ready
// This is better UX than blocking text rendering (display=block)
export function getGoogleFontsUrl(font: FontConfig): string | null {
  if (font.type !== "google") return null;
  return `https://fonts.googleapis.com/css2?family=${font.googleFontsFamily}&display=swap`;
}

// Get the CSS font-family value with fallbacks
export function getFontFamilyValue(font: FontConfig): string {
  const family = font.fontFamily.includes(" ")
    ? `'${font.fontFamily}'`
    : font.fontFamily;
  return [family, ...font.fallback].join(", ");
}
