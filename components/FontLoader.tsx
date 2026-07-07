// Server-side font loading component
// Following Google's best practices: https://web.dev/articles/font-best-practices

import {
  getFontConfig,
  getGoogleFontsUrl,
  getFontFamilyValue,
  getFontBaseSize,
  defaultFontId,
} from "src/fonts";
import { getMetricFallbackFace } from "src/fontMetricFallbacks";

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

// Google Fonts CSS is stable enough that instance-lifetime staleness is fine.
// Failures aren't memoized so a transient fetch error doesn't stick until
// instance recycle.
const googleFontsCssMemo = new Map<string, Promise<string | null>>();
function getGoogleFontsCss(url: string): Promise<string | null> {
  let cached = googleFontsCssMemo.get(url);
  if (!cached) {
    cached = fetchGoogleFontsCss(url).then((css) => {
      if (css === null) googleFontsCssMemo.delete(url);
      return css;
    });
    googleFontsCssMemo.set(url, cached);
  }
  return cached;
}

// Only the upright latin subset is worth preloading — it covers the
// initially-rendered text; italic and non-latin subsets load on demand.
function extractLatinWoff2Urls(css: string): string[] {
  const urls: string[] = [];
  const blocks = css.matchAll(/\/\*\s*latin\s*\*\/\s*@font-face\s*\{([^}]+)\}/g);
  for (const [, block] of blocks) {
    if (!/font-style:\s*normal/.test(block)) continue;
    const src = block.match(
      /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/
    );
    if (src) urls.push(src[1]);
  }
  return urls;
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

  const fontCss = await Promise.all(
    googleFontsUrls.map(async (url) => ({
      url,
      css: await getGoogleFontsCss(url),
    }))
  );
  const inlinedFonts = fontCss.filter((f) => f.css !== null);
  const fallbackFonts = fontCss.filter((f) => f.css === null);

  const preloadUrls = [
    ...new Set(inlinedFonts.flatMap(({ css }) => extractLatinWoff2Urls(css!))),
  ];

  const metricFallbackCSS = fontsToLoad
    .map((font) => getMetricFallbackFace(font))
    .filter(Boolean)
    .join("\n");

  return (
    <>
      {googleFontsUrls.length > 0 && (
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      )}
      {preloadUrls.map((url) => (
        <link
          key={url}
          rel="preload"
          href={url}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      ))}
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
      {metricFallbackCSS && (
        <style dangerouslySetInnerHTML={{ __html: metricFallbackCSS }} />
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
