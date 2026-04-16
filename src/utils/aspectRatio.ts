export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// Find the simplest fraction close to a decimal by testing small denominators
export function toFraction(
  decimal: number,
  maxDenominator = 100,
): [number, number] {
  let bestNum = 1,
    bestDen = 1,
    bestErr = Infinity;
  for (let d = 1; d <= maxDenominator; d++) {
    let n = Math.round(decimal * d);
    let err = Math.abs(decimal - n / d);
    if (err < bestErr) {
      bestErr = err;
      bestNum = n;
      bestDen = d;
      if (err < 1e-9) break;
    }
  }
  let d = gcd(bestNum, bestDen);
  return [bestNum / d, bestDen / d];
}

export function getAspectRatio(
  media:
    | { width?: number; height?: number; "aspect-ratio"?: number }
    | undefined,
): string | null {
  if (!media) return null;
  if (media["aspect-ratio"]) {
    let [w, h] = toFraction(media["aspect-ratio"]);
    return `${w}/${h}`;
  }
  if (media.width && media.height) {
    let d = gcd(media.width, media.height);
    return `${media.width / d}/${media.height / d}`;
  }
  return null;
}
