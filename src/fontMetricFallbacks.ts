// Metric-matched fallback @font-face rules so the font swap doesn't shift
// layout. The rules are precomputed by scripts/generate-font-metric-fallbacks.mjs
// from @capsizecss/metrics font data — this module is just a lookup.
//
// Only the built-in theme fonts in src/fonts.ts have precomputed fallbacks;
// custom Google fonts fall through to the plain fallback stack.

import { FontConfig, getMetricFallbackName } from "src/fonts";
import { metricFallbackFaces } from "./fontMetricFallbacks.generated";

export function getMetricFallbackFace(font: FontConfig): string | null {
  if (!getMetricFallbackName(font)) return null;
  return metricFallbackFaces[font.fontFamily] ?? null;
}
