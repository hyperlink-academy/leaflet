// Metric-matched fallback @font-face rules so the font swap doesn't shift
// layout: a locally-installed font (Georgia/Arial/Courier New) is scaled to
// the web font's metrics via size-adjust + ascent/descent/line-gap overrides.
// This is the same technique next/font uses (adjustFontFallback), applied to
// the per-publication theme fonts which are only known at request time.
// https://developer.chrome.com/blog/font-fallbacks
//
// Metrics are statically imported per font (~1KB each) rather than pulling in
// @capsizecss/metrics' full 4MB collection, so custom Google fonts beyond the
// built-in theme fonts don't get a metric-matched fallback — they just fall
// through to the plain fallback stack.

import lora from "@capsizecss/metrics/lora";
import atkinsonHyperlegibleNext from "@capsizecss/metrics/atkinsonHyperlegibleNext";
import sometypeMono from "@capsizecss/metrics/sometypeMono";
import montserrat from "@capsizecss/metrics/montserrat";
import sourceSans3 from "@capsizecss/metrics/sourceSans3";
import arial from "@capsizecss/metrics/arial";
import georgia from "@capsizecss/metrics/georgia";
import courierNew from "@capsizecss/metrics/courierNew";
import { FontConfig, getMetricFallbackName } from "src/fonts";

type FontMetrics = typeof lora;

const webFontMetrics: Record<string, FontMetrics> = {
  Lora: lora,
  "Atkinson Hyperlegible Next": atkinsonHyperlegibleNext,
  "Sometype Mono": sometypeMono,
  Montserrat: montserrat,
  "Source Sans 3": sourceSans3,
};

// Locally-installed font to base the fallback on, by web font category
const localFallbackMetrics: Record<string, FontMetrics> = {
  serif: georgia,
  monospace: courierNew,
  "sans-serif": arial,
};

const pct = (n: number) => `${(n * 100).toFixed(3)}%`;

// Formulas from https://developer.chrome.com/blog/font-fallbacks
export function getMetricFallbackFace(font: FontConfig): string | null {
  const name = getMetricFallbackName(font);
  if (!name) return null;
  const web = webFontMetrics[font.fontFamily];
  if (!web) return null;
  const local = localFallbackMetrics[web.category] ?? arial;

  const sizeAdjust =
    web.xWidthAvg / web.unitsPerEm / (local.xWidthAvg / local.unitsPerEm);
  const adjustedEm = web.unitsPerEm * sizeAdjust;

  return `@font-face {
  font-family: '${name}';
  src: local('${local.familyName}');
  size-adjust: ${pct(sizeAdjust)};
  ascent-override: ${pct(web.ascent / adjustedEm)};
  descent-override: ${pct(Math.abs(web.descent) / adjustedEm)};
  line-gap-override: ${pct(web.lineGap / adjustedEm)};
}`;
}
