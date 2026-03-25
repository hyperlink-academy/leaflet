// Server-side font loading component
// Following Google's best practices: https://web.dev/articles/font-best-practices
// - Preconnect to font origins for early connection
// - Use font-display: swap (shows fallback immediately, swaps when ready)
// - Don't block rendering - some FOUT is acceptable and better UX than invisible text

import {
  getFontConfig,
  getGoogleFontsUrl,
  getFontFamilyValue,
  getFontBaseSize,
  defaultFontId,
} from "src/fonts";

type FontLoaderProps = {
  headingFontId: string | undefined;
  bodyFontId: string | undefined;
};

export function FontLoader({ headingFontId, bodyFontId }: FontLoaderProps) {
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

  return (
    <>
      {/*
        Google Fonts best practice: preconnect to both origins
        - fonts.googleapis.com serves the CSS
        - fonts.gstatic.com serves the font files (needs crossorigin for CORS)
        Place these as early as possible in <head>
      */}
      {googleFontsUrls.length > 0 && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          {googleFontsUrls.map((url) => (
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
  facts: Array<{ entity: string; attribute: string; data: { value: string } | Record<string, unknown> }>,
  rootEntity: string
): { headingFontId: string | undefined; bodyFontId: string | undefined } {
  const headingFontFact = facts.find(
    (f) => f.entity === rootEntity && f.attribute === "theme/heading-font"
  );
  const bodyFontFact = facts.find(
    (f) => f.entity === rootEntity && f.attribute === "theme/body-font"
  );
  return {
    headingFontId: headingFontFact?.data?.value as string | undefined,
    bodyFontId: bodyFontFact?.data?.value as string | undefined,
  };
}
