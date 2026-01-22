// Server-side font loading component
// Following Google's best practices: https://web.dev/articles/font-best-practices
// - Preconnect to font origins for early connection
// - Use font-display: swap (shows fallback immediately, swaps when ready)
// - Don't block rendering - some FOUT is acceptable and better UX than invisible text

import {
  getFontConfig,
  generateFontFaceCSS,
  getFontPreloadLinks,
  getGoogleFontsUrl,
  getFontFamilyValue,
} from "src/fonts";

type FontLoaderProps = {
  headingFontId: string | undefined;
  bodyFontId: string | undefined;
};

export function FontLoader({ headingFontId, bodyFontId }: FontLoaderProps) {
  const headingFont = getFontConfig(headingFontId);
  const bodyFont = getFontConfig(bodyFontId);

  // Collect all unique fonts to load
  const fontsToLoad = headingFont.id === bodyFont.id
    ? [headingFont]
    : [headingFont, bodyFont];

  // Collect preload links (deduplicated)
  const preloadLinksSet = new Set<string>();
  const preloadLinks: { href: string; type: string }[] = [];
  for (const font of fontsToLoad) {
    for (const link of getFontPreloadLinks(font)) {
      if (!preloadLinksSet.has(link.href)) {
        preloadLinksSet.add(link.href);
        preloadLinks.push(link);
      }
    }
  }

  // Collect font-face CSS
  const fontFaceCSS = fontsToLoad
    .map((font) => generateFontFaceCSS(font))
    .filter(Boolean)
    .join("\n\n");

  // Collect Google Fonts URLs (deduplicated)
  const googleFontsUrls = [...new Set(
    fontsToLoad
      .map((font) => getGoogleFontsUrl(font))
      .filter((url): url is string => url !== null)
  )];

  const headingFontValue = getFontFamilyValue(headingFont);
  const bodyFontValue = getFontFamilyValue(bodyFont);

  // Generate CSS that sets the font family via CSS variables
  // --theme-font is used for body text (keeps backwards compatibility)
  // --theme-heading-font is used for headings
  const fontVariableCSS = `
:root {
  --theme-heading-font: ${headingFontValue};
  --theme-font: ${bodyFontValue};
}
`.trim();

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
      {/* Preload local font files for early discovery */}
      {preloadLinks.map((link) => (
        <link
          key={link.href}
          rel="preload"
          href={link.href}
          as="font"
          type={link.type}
          crossOrigin="anonymous"
        />
      ))}
      {/* @font-face declarations (for local fonts) and CSS variable */}
      <style
        dangerouslySetInnerHTML={{
          __html: `${fontFaceCSS}\n\n${fontVariableCSS}`,
        }}
      />
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
