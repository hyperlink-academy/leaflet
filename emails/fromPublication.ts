import { defaultEmailTheme, type EmailTheme } from "./shared";
import type { PubLeafletPublication } from "lexicons/api";
import { getFontConfig, getFontFamilyValue } from "src/fonts";

type ThemeColor = {
  $type?: string;
  r?: number;
  g?: number;
  b?: number;
  a?: number;
};

const colorToCss = (color: unknown, fallback: string): string => {
  const c = color as ThemeColor | undefined;
  if (!c || typeof c.r !== "number") return fallback;
  if (c.$type === "pub.leaflet.theme.color#rgba") {
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${(c.a ?? 100) / 100})`;
  }
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
};

export const resolveEmailTheme = (
  theme: PubLeafletPublication.Theme | undefined,
): EmailTheme => {
  if (!theme) return defaultEmailTheme;
  return {
    primary: colorToCss(theme.primary, defaultEmailTheme.primary),
    pageBackground: colorToCss(
      theme.pageBackground,
      defaultEmailTheme.pageBackground,
    ),
    backgroundColor: colorToCss(
      theme.backgroundColor,
      defaultEmailTheme.backgroundColor,
    ),
    accentBackground: colorToCss(
      theme.accentBackground,
      defaultEmailTheme.accentBackground,
    ),
    accentText: colorToCss(theme.accentText, defaultEmailTheme.accentText),
    headingFont: getFontFamilyValue(getFontConfig(theme.headingFont)),
    bodyFont: getFontFamilyValue(getFontConfig(theme.bodyFont)),
    pageWidth: theme.pageWidth ?? defaultEmailTheme.pageWidth,
    showPageBackground: theme.showPageBackground ?? false,
  };
};

type NormalizedPublicationLike = {
  name?: string;
  url?: string;
  theme?: PubLeafletPublication.Theme;
};

// Single choke point for translating a normalized publication record into the
// publication-scoped PostEmail props (name, url, theme). The broadcast and
// preview send paths both route through here so theme handling stays in sync.
export const emailPropsFromPublication = (
  pub: NormalizedPublicationLike | null | undefined,
): {
  publicationName: string;
  publicationUrl: string;
  theme: EmailTheme;
} => ({
  publicationName: pub?.name || "Publication",
  publicationUrl: pub?.url || "https://leaflet.pub",
  theme: resolveEmailTheme(pub?.theme),
});
