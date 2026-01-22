// Server-side font loading component
// Replicates next/font behavior: preload links, @font-face, and CSS variable
// This is rendered on the server and the link/style tags are hoisted to <head>

import { getFontConfig, generateFontFaceCSS, getFontPreloadLinks, FontConfig } from "src/fonts";

type FontLoaderProps = {
  fontId: string | undefined;
};

export function FontLoader({ fontId }: FontLoaderProps) {
  const font = getFontConfig(fontId);
  const preloadLinks = getFontPreloadLinks(font);
  const fontFaceCSS = generateFontFaceCSS(font);

  // Generate CSS that sets the font family via CSS variable
  const fontVariableCSS = `
:root {
  --theme-font: '${font.fontFamily}', ${font.fallback.join(", ")};
}
`.trim();

  return (
    <>
      {/* Preload font files - these get hoisted to <head> by React/Next.js */}
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
      {/* @font-face declarations and CSS variable */}
      <style
        dangerouslySetInnerHTML={{
          __html: `${fontFaceCSS}\n\n${fontVariableCSS}`,
        }}
      />
    </>
  );
}

// Helper to extract font from facts array (for server-side use)
export function extractFontFromFacts(
  facts: Array<{ entity: string; attribute: string; data: { value: string } }>,
  rootEntity: string
): string | undefined {
  const fontFact = facts.find(
    (f) => f.entity === rootEntity && f.attribute === "theme/font"
  );
  return fontFact?.data?.value;
}
