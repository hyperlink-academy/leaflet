// Only the built-in theme fonts in src/fonts.ts have precomputed fallbacks;
// custom Google fonts fall through to the plain fallback stack.

import { FontConfig, getMetricFallbackName } from "src/fonts";
import { metricFallbackFaces } from "./fontMetricFallbacks.generated";

export function getMetricFallbackFace(font: FontConfig): string | null {
  if (!getMetricFallbackName(font)) return null;
  return metricFallbackFaces[font.fontFamily] ?? null;
}
