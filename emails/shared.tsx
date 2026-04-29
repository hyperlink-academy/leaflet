import { Head, Img, Link, pixelBasedPreset } from "@react-email/components";
import React from "react";

export type EmailTheme = {
  primary: string;
  pageBackground: string;
  backgroundColor: string;
  accentBackground: string;
  accentText: string;
  headingFont: string;
  bodyFont: string;
  // Matches the publication's web `pageWidth` (px) so subscribers see the
  // post at the same column width in their inbox as on the live page.
  // Default 624 mirrors `ThemeProvider.tsx`'s fallback.
  pageWidth: number;
};

export const defaultEmailTheme: EmailTheme = {
  primary: "rgb(39, 39, 39)",
  pageBackground: "rgb(255, 255, 255)",
  backgroundColor: "rgb(240, 247, 250)",
  accentBackground: "rgb(0, 0, 225)",
  accentText: "rgb(255, 255, 255)",
  headingFont: "Georgia, serif",
  bodyFont: "Verdana, sans-serif",
  pageWidth: 624,
};

// Parse rgb()/rgba()/#hex into [r, g, b]. Returns black on parse failure —
// theme colors come from a typed config so this is just defensive.
const parseColor = (input: string): [number, number, number] => {
  const rgbMatch = input.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  if (rgbMatch)
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  const hexMatch = input.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const h = hexMatch[1];
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  const hex3 = input.match(/^#([0-9a-f]{3})$/i);
  if (hex3) {
    const h = hex3[1];
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ];
  }
  return [0, 0, 0];
};

// Linear sRGB mix of two colors. We resolve theme tints to literal rgb() at
// render time because Gmail's CSS sanitizer drops `color-mix(...)` —
// leaving borders invisible and tinted text falling back to defaults.
// Linear mixing isn't perceptually identical to the oklab original, but
// for the near-grayscale tints we use it's visually indistinguishable.
export const mixRgb = (a: string, b: string, bPercent: number): string => {
  const [ar, ag, ab] = parseColor(a);
  const [br, bg, bb] = parseColor(b);
  const t = bPercent / 100;
  const round = (x: number) => Math.round(x);
  return `rgb(${round(ar * (1 - t) + br * t)}, ${round(
    ag * (1 - t) + bg * t,
  )}, ${round(ab * (1 - t) + bb * t)})`;
};

export type ResolvedColors = {
  primary: string;
  secondary: string;
  tertiary: string;
  border: string;
  borderLight: string;
};

export const resolveColors = (theme: EmailTheme): ResolvedColors => ({
  primary: theme.primary,
  secondary: mixRgb(theme.primary, theme.pageBackground, 25),
  tertiary: mixRgb(theme.primary, theme.pageBackground, 55),
  border: mixRgb(theme.primary, theme.pageBackground, 75),
  borderLight: mixRgb(theme.primary, theme.pageBackground, 85),
});

// Postmark fetches `<img src>` and link `href` values verbatim from the
// rendered HTML — relative paths break. Templates accept an `assetsBaseUrl`
// prop and use this builder for `/email-assets/*` references.
export const makeStaticUrl = (assetsBaseUrl: string) => {
  const base = assetsBaseUrl.replace(/\/$/, "");
  return (filename: string): string => `${base}/email-assets/${filename}`;
};

// React's TypeScript types don't include the deprecated `bgcolor` HTML
// attribute on <td>, but every email client (especially Outlook) reads it
// directly — so we spread it via a typed cast. Combined with an inline
// background-color style for clients that do honor CSS, this is the
// belt-and-suspenders pattern for reliable email backgrounds.
export const bgcolorAttr = (color: string): Record<string, string> => ({
  bgcolor: color,
});

// Tailwind config shared by the Leaflet/publication confirm emails.
// All `color-mix(in oklab, ...)` expressions are pre-resolved to plain
// rgb() because Gmail's CSS sanitizer drops `color-mix()` — leaving
// classes like `text-secondary` and `border-border` rendering with no
// color in Gmail.
const CONFIRM_PRIMARY = "rgb(39, 39, 39)";
const CONFIRM_PAGE_BG = "rgb(255, 255, 255)";

export const confirmEmailTailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    screens: {
      sm: "640px",
      md: "960px",
      lg: "1280px",
    },
    borderRadius: {
      none: "0",
      md: "0.25rem",
      lg: "0.5rem",
      full: "9999px",
    },
    colors: {
      inherit: "inherit",
      transparent: "transparent",
      current: "currentColor",
      primary: CONFIRM_PRIMARY,
      secondary: mixRgb(CONFIRM_PRIMARY, CONFIRM_PAGE_BG, 25),
      tertiary: mixRgb(CONFIRM_PRIMARY, CONFIRM_PAGE_BG, 55),
      border: mixRgb(CONFIRM_PRIMARY, CONFIRM_PAGE_BG, 75),
      "border-light": mixRgb(CONFIRM_PRIMARY, CONFIRM_PAGE_BG, 85),
      white: "#FFFFFF",
      "accent-1": "rgb(0, 0, 225)",
      "accent-2": "rgb(255, 255, 255)",
      "accent-contrast": "rgb(0, 0, 225)",
      "bg-leaflet": "rgb(240, 247, 250)",
      "bg-page": "rgba(255, 255, 255, 1)",
      "highlight-1": "rgb(255, 177, 177)",
      "highlight-2": "rgb(253, 245, 203)",
      "highlight-3": "rgb(255, 205, 195)",
    },
    fontSize: {
      xs: ".75rem",
      sm: ".875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.625rem",
      "2xl": "2rem",
    },
    extend: {
      fontFamily: {
        sans: ["Verdana"],
        serif: ["Georgia"],
      },
    },
  },
};

// Wraps `<Head>` with the viewport meta that prevents iOS Mail / Gmail iOS
// from auto-shrinking the email to fit a wider-than-viewport layout (which
// makes every element render visually small). Templates can pass extra
// children — usually a `<style>` block with template-specific @media
// rules — and they'll be appended after the meta.
export const MailHead = ({ children }: { children?: React.ReactNode }) => (
  <Head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    {children}
  </Head>
);

export const LeafletWatermark = ({
  staticUrl,
  theme = defaultEmailTheme,
}: {
  staticUrl?: (filename: string) => string;
  theme?: EmailTheme;
} = {}) => {
  const c = resolveColors(theme);
  // Mail clients fetch <img src> verbatim, so the fallback must be absolute.
  const leafletSrc = staticUrl
    ? staticUrl("leaflet.png")
    : "https://leaflet.pub/email-assets/leaflet.png";
  // Shrink-to-fit table with align="center" — the bulletproof email
  // pattern for centering a chunk of inline content within whatever
  // container it lands in (works inside both <td align="center"> in the
  // post template and a bare Body in the confirm emails).
  return (
    <table
      role="presentation"
      align="center"
      cellPadding={0}
      cellSpacing={0}
      border={0}
    >
      <tbody>
        <tr>
          <td>
            <Link
              href="https://leaflet.pub"
              style={{
                color: c.tertiary,
                fontFamily: theme.bodyFont,
                fontSize: 14,
                fontStyle: "italic",
                textDecoration: "none",
              }}
            >
              <Img
                src={leafletSrc}
                width={16}
                height={16}
                alt=""
                style={{
                  display: "inline-block",
                  marginRight: 4,
                  verticalAlign: "middle",
                }}
              />
              <span style={{ verticalAlign: "middle" }}>
                Published with{" "}
                <span
                  style={{
                    color: theme.accentBackground,
                    fontWeight: "bold",
                  }}
                >
                  Leaflet
                </span>
              </span>
            </Link>
          </td>
        </tr>
      </tbody>
    </table>
  );
};
