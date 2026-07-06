// Server-side font loading component
// Following Google's best practices: https://web.dev/articles/font-best-practices
// - Inline the Google Fonts CSS so the browser doesn't make a render-blocking
//   request to fonts.googleapis.com (saves a DNS+TLS+request round trip)
// - Preconnect to fonts.gstatic.com for the font files themselves
// - Use font-display: swap (shows fallback immediately, swaps when ready)
// - Don't block rendering - some FOUT is acceptable and better UX than invisible text

import {
  getFontConfig,
  getGoogleFontsUrl,
  getFontFamilyValue,
  getFontBaseSize,
  defaultFontId,
} from "src/fonts";

// Google Fonts varies its CSS response by User-Agent; pin a modern Chrome UA
// so we always get woff2 sources with unicode-range subsets.
const GOOGLE_FONTS_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function fetchGoogleFontsCss(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": GOOGLE_FONTS_UA },
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    const css = await res.text();
    if (!css.includes("@font-face")) return null;
    return css;
  } catch {
    return null;
  }
}

type FontLoaderProps = {
  headingFontId: string | undefined;
  bodyFontId: string | undefined;
};

export async function FontLoader({ headingFontId, bodyFontId }: FontLoaderProps) {
  const headingFont = getFontConfig(headingFontId);
  const bodyFont = getFontConfig(bodyFontId);

  // Don't load the default font (Quattro) here — it's already loaded via
  // next/font/local in layout.tsx under --font-quattro. Loading it again with
  // a different family name ('iA Writer Quattro V') causes issues when the
  // @font-face from this component isn't available (e.g., client-side navigation).
  const isDefaultHeading = headingFont.id === defaultFontId;
  const isDefaultBody = bodyFont.id === defaultFontId;

  // Collect Google Fonts URLs (deduplicated)
  const fontsToLoad = [headingFont, bodyFont].filter(
    (f, i, arr) => f.id !== defaultFontId && arr.findIndex((o) => o.id === f.id) === i
  );
  const googleFontsUrls = [...new Set(
    fontsToLoad
      .map((font) => getGoogleFontsUrl(font))
      .filter((url): url is string => url !== null)
  )];

  const headingFontValue = isDefaultHeading
    ? (isDefaultBody ? null : "var(--font-quattro)")
    : getFontFamilyValue(headingFont);
  const bodyFontValue = isDefaultBody
    ? (isDefaultHeading ? null : "var(--font-quattro)")
    : getFontFamilyValue(bodyFont);
  const bodyFontBaseSize = isDefaultBody ? null : getFontBaseSize(bodyFont);

  // Set font CSS variables scoped to .leafletWrapper so they don't affect app UI
  // Don't set variables for the default font — let CSS fallback to var(--font-quattro)
  const fontVariableLines = [
    headingFontValue && `  --theme-heading-font: ${headingFontValue};`,
    bodyFontValue && `  --theme-font: ${bodyFontValue};`,
    bodyFontBaseSize && `  --theme-font-base-size: ${bodyFontBaseSize}px;`,
  ].filter(Boolean);

  const fontVariableCSS = fontVariableLines.length > 0
    ? `.leafletWrapper {\n${fontVariableLines.join("\n")}\n}`
    : "";

  // Inline the Google Fonts CSS server-side so the browser skips the
  // render-blocking stylesheet request to fonts.googleapis.com. The fetch is
  // cached in the Next.js data cache for a day. If the fetch fails, fall back
  // to the stylesheet link.
  const fontCss = await Promise.all(
    googleFontsUrls.map(async (url) => ({
      url,
      css: await fetchGoogleFontsCss(url),
    }))
  );
  const inlinedFonts = fontCss.filter((f) => f.css !== null);
  const fallbackFonts = fontCss.filter((f) => f.css === null);

  return (
    <>
      {/*
        Preconnect to the font origins:
        - fonts.gstatic.com serves the font files (needs crossorigin for CORS)
        - fonts.googleapis.com serves the CSS (only needed on fallback)
        Place these as early as possible in <head>
      */}
      {googleFontsUrls.length > 0 && (
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      )}
      {inlinedFonts.map(({ url, css }) => (
        <style
          key={url}
          data-google-fonts={url}
          dangerouslySetInnerHTML={{ __html: css! }}
        />
      ))}
      {fallbackFonts.length > 0 && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          {fallbackFonts.map(({ url }) => (
            <link key={url} rel="stylesheet" href={url} />
          ))}
        </>
      )}
      {/* CSS variables scoped to .leafletWrapper for SSR (before client hydration) */}
      {fontVariableCSS && (
        <style
          dangerouslySetInnerHTML={{
            __html: fontVariableCSS,
          }}
        />
      )}
    </>
  );
}

// Helper to extract fonts from facts array (for server-side use)
export function extractFontsFromFacts(
  facts: Array<{ entity: string; attribute: string; data: { value: string } }>,
  rootEntity: string
): { headingFontId: string | undefined; bodyFontId: string | undefined } {
  const headingFontFact = facts.find(
    (f) => f.entity === rootEntity && f.attribute === "theme/heading-font"
  );
  const bodyFontFact = facts.find(
    (f) => f.entity === rootEntity && f.attribute === "theme/body-font"
  );
  return {
    headingFontId: headingFontFact?.data?.value,
    bodyFontId: bodyFontFact?.data?.value,
  };
}
