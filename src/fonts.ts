// Font configuration for self-hosted custom fonts
// This replicates what next/font does but allows dynamic selection per-leaflet

export type FontConfig = {
  id: string;
  displayName: string;
  fontFamily: string;
  files: {
    path: string;
    style: "normal" | "italic";
    weight?: string;
  }[];
  fallback: string[];
};

export const fonts: Record<string, FontConfig> = {
  quattro: {
    id: "quattro",
    displayName: "Quattro",
    fontFamily: "iA Writer Quattro V",
    files: [
      { path: "/fonts/iAWriterQuattroV.ttf", style: "normal" },
      { path: "/fonts/iAWriterQuattroV-Italic.ttf", style: "italic" },
    ],
    fallback: ["system-ui", "sans-serif"],
  },
  lora: {
    id: "lora",
    displayName: "Lora",
    fontFamily: "Lora",
    files: [
      { path: "/fonts/Lora-VariableFont.ttf", style: "normal", weight: "400 700" },
      { path: "/fonts/Lora-Italic-VariableFont.ttf", style: "italic", weight: "400 700" },
    ],
    fallback: ["Georgia", "serif"],
  },
};

export const defaultFontId = "quattro";

export function getFontConfig(fontId: string | undefined): FontConfig {
  return fonts[fontId || defaultFontId] || fonts[defaultFontId];
}

// Generate @font-face CSS for a font
export function generateFontFaceCSS(font: FontConfig): string {
  return font.files
    .map(
      (file) => `
@font-face {
  font-family: '${font.fontFamily}';
  src: url('${file.path}') format('truetype');
  font-style: ${file.style};
  font-weight: ${file.weight || "normal"};
  font-display: swap;
}`.trim()
    )
    .join("\n\n");
}

// Generate preload link attributes for a font
export function getFontPreloadLinks(font: FontConfig): { href: string; type: string }[] {
  return font.files.map((file) => ({
    href: file.path,
    type: "font/ttf",
  }));
}
