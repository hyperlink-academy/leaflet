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
      {
        path: "/fonts/iaw-quattro-vf.woff2",
        style: "normal",
        weight: "400 700",
      },
      {
        path: "/fonts/iaw-quattro-vf-Italic.woff2",
        style: "italic",
        weight: "400 700",
      },
    ],
    fallback: ["system-ui", "sans-serif"],
  },
  lora: {
    id: "lora",
    displayName: "Lora",
    fontFamily: "Lora",
    type: "local",
    files: [
      {
        path: "/fonts/Lora-Variable.woff2",
        style: "normal",
        weight: "400 700",
      },
      {
        path: "/fonts/Lora-Italic-Variable.woff2",
        style: "italic",
        weight: "400 700",
      },
    ],
    fallback: ["Georgia", "serif"],
  },
  "source-sans": {
    id: "source-sans",
    displayName: "Source Sans",
    fontFamily: "Source Sans 3",
    type: "local",
    files: [
      {
        path: "/fonts/SourceSans3-Variable.woff2",
        style: "normal",
        weight: "200 900",
      },
      {
        path: "/fonts/SourceSans3-Italic-Variable.woff2",
        style: "italic",
        weight: "200 900",
      },
    ],
    fallback: ["system-ui", "sans-serif"],
  },
  "atkinson-hyperlegible": {
    id: "atkinson-hyperlegible",
    displayName: "Atkinson Hyperlegible",
    fontFamily: "Atkinson Hyperlegible Next",
    type: "local",
    files: [
      {
        path: "/fonts/AtkinsonHyperlegibleNext-Variable.woff2",
        style: "normal",
        weight: "200 800",
      },
      {
        path: "/fonts/AtkinsonHyperlegibleNext-Italic-Variable.woff2",
        style: "italic",
        weight: "200 800",
      },
    ],
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
  const googleFontsFamily = `${trimmed.replace(/ /g, "+")}:wght@400;700`;
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
export function getFontPreloadLinks(
  font: FontConfig,
): { href: string; type: string }[] {
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
