// Font configuration for Google Fonts and the default system font
// Allows dynamic font selection per-leaflet

export type FontConfig = {
  id: string;
  displayName: string;
  fontFamily: string;
  fallback: string[];
  baseSize?: number; // base font size in px for document content
} & (
  | {
      // Google Fonts loaded via CDN
      type: "google";
      googleFontsFamily: string; // e.g., "Open+Sans:ital,wght@0,400;0,700;1,400;1,700"
    }
  | {
      // System fonts or fonts loaded elsewhere (e.g. next/font/local)
      type: "system";
    }
);

export const fonts: Record<string, FontConfig> = {
  quattro: {
    id: "quattro",
    displayName: "iA Writer Quattro",
    fontFamily: "iA Writer Quattro V",
    baseSize: 16,
    type: "system", // Loaded via next/font/local in layout.tsx
    fallback: ["system-ui", "sans-serif"],
  },
  lora: {
    id: "lora",
    displayName: "Lora",
    fontFamily: "Lora",
    baseSize: 17,
    type: "google",
    googleFontsFamily: "Lora:ital,wght@0,400..700;1,400..700",
    fallback: ["Georgia", "serif"],
  },
  "atkinson-hyperlegible": {
    id: "atkinson-hyperlegible",
    displayName: "Atkinson Hyperlegible",
    fontFamily: "Atkinson Hyperlegible Next",
    baseSize: 18,
    type: "google",
    googleFontsFamily:
      "Atkinson+Hyperlegible+Next:ital,wght@0,200..800;1,200..800",
    fallback: ["system-ui", "sans-serif"],
  },
  // Additional Google Fonts - Mono
  "sometype-mono": {
    id: "sometype-mono",
    displayName: "Sometype Mono",
    fontFamily: "Sometype Mono",
    baseSize: 17,
    type: "google",
    googleFontsFamily: "Sometype+Mono:ital,wght@0,400;0,700;1,400;1,700",
    fallback: ["monospace"],
  },

  // Additional Google Fonts - Sans
  montserrat: {
    id: "montserrat",
    displayName: "Montserrat",
    fontFamily: "Montserrat",
    baseSize: 17,
    type: "google",
    googleFontsFamily: "Montserrat:ital,wght@0,400;0,700;1,400;1,700",
    fallback: ["system-ui", "sans-serif"],
  },
  "source-sans": {
    id: "source-sans",
    displayName: "Source Sans 3",
    fontFamily: "Source Sans 3",
    baseSize: 18,
    type: "google",
    googleFontsFamily: "Source+Sans+3:ital,wght@0,400;0,700;1,400;1,700",
    fallback: ["system-ui", "sans-serif"],
  },
};

export const defaultFontId = "quattro";
export const defaultBaseSize = 16;

// Parse a Google Fonts URL or string to extract the font name and family parameter
// Supports various formats:
// - Full URL: https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=swap
// - Family param: Open+Sans:ital,wght@0,400;0,700
// - Just font name: Open Sans
export function parseGoogleFontInput(input: string): {
  fontName: string;
  googleFontsFamily: string;
} | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try to parse as full URL
  try {
    const url = new URL(trimmed);
    const family = url.searchParams.get("family");
    if (family) {
      // Extract font name from family param (before the colon if present)
      const fontName = family.split(":")[0].replace(/\+/g, " ");
      return { fontName, googleFontsFamily: family };
    }
  } catch {
    // Not a valid URL, continue with other parsing
  }

  // Check if it's a family parameter with weight/style specifiers (contains : or @)
  if (trimmed.includes(":") || trimmed.includes("@")) {
    const fontName = trimmed.split(":")[0].replace(/\+/g, " ");
    // Ensure plus signs are used for spaces in the family param
    const googleFontsFamily = trimmed.includes("+")
      ? trimmed
      : trimmed.replace(/ /g, "+");
    return { fontName, googleFontsFamily };
  }

  // Treat as just a font name - construct a basic family param with common weights
  const fontName = trimmed.replace(/\+/g, " ");
  const googleFontsFamily = `${trimmed.replace(/ /g, "+")}:ital,wght@0,400;0,700;1,400;1,700`;
  return { fontName, googleFontsFamily };
}

// Custom font ID format: "custom:FontName:googleFontsFamily"
export function createCustomFontId(
  fontName: string,
  googleFontsFamily: string,
): string {
  return `custom:${fontName}:${googleFontsFamily}`;
}

export function isCustomFontId(fontId: string): boolean {
  return fontId.startsWith("custom:");
}

export function parseCustomFontId(fontId: string): {
  fontName: string;
  googleFontsFamily: string;
} | null {
  if (!isCustomFontId(fontId)) return null;
  const parts = fontId.slice("custom:".length).split(":");
  if (parts.length < 2) return null;
  const fontName = parts[0];
  const googleFontsFamily = parts.slice(1).join(":");
  return { fontName, googleFontsFamily };
}

export function getFontConfig(fontId: string | undefined): FontConfig {
  if (!fontId) return fonts[defaultFontId];

  // Check for custom font
  if (isCustomFontId(fontId)) {
    const parsed = parseCustomFontId(fontId);
    if (parsed) {
      return {
        id: fontId,
        displayName: parsed.fontName,
        fontFamily: parsed.fontName,
        type: "google",
        googleFontsFamily: parsed.googleFontsFamily,
        fallback: ["system-ui", "sans-serif"],
      };
    }
  }

  return fonts[fontId] || fonts[defaultFontId];
}

// Get Google Fonts URL for a font
// Using display=swap per Google's recommendation: shows fallback immediately, swaps when ready
// This is better UX than blocking text rendering (display=block)
export function getGoogleFontsUrl(font: FontConfig): string | null {
  if (font.type !== "google") return null;
  return `https://fonts.googleapis.com/css2?family=${font.googleFontsFamily}&display=swap`;
}

// Get the base font size for a font config
export function getFontBaseSize(font: FontConfig): number {
  return font.baseSize ?? defaultBaseSize;
}

// Get the CSS font-family value with fallbacks
export function getFontFamilyValue(font: FontConfig): string {
  const family = font.fontFamily.includes(" ")
    ? `'${font.fontFamily}'`
    : font.fontFamily;
  return [family, ...font.fallback].join(", ");
}
