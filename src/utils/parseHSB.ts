// X = <negative/positive number with/without decimal places>
// before/after a comma, 0 or more whitespaces are allowed
// - hsb(X, X%, X%)
// - hsba(X, X%, X%, X)
const HSB_REGEX =
  /hsb\(([-+]?\d+(?:.\d+)?\s*,\s*[-+]?\d+(?:.\d+)?%\s*,\s*[-+]?\d+(?:.\d+)?%)\)|hsba\(([-+]?\d+(?:.\d+)?\s*,\s*[-+]?\d+(?:.\d+)?%\s*,\s*[-+]?\d+(?:.\d+)?%\s*,\s*[-+]?\d(.\d+)?)\)/;

export function parseHSBToRGB(color: string) {
  let m: RegExpMatchArray | null;
  if ((m = color.match(HSB_REGEX))) {
    const [h, s, b, a] = (m[1] ?? m[2])
      .split(",")
      .map((n) => Number(n.trim().replace("%", "")));
    let hue = normalizeHue(h);
    let saturation = s / 100;
    let brightness = b / 100;
    let fn = (n: number, k = (n + hue / 60) % 6) =>
      brightness - saturation * brightness * Math.max(Math.min(k, 4 - k, 1), 0);
    let [red, green, blue] = [
      Math.round(fn(5) * 255),
      Math.round(fn(3) * 255),
      Math.round(fn(1) * 255),
      a,
    ];
    return `rgb(${red}, ${green}, ${blue})`;
  }
}

export function normalizeHue(hue: number) {
  if (hue === 360) {
    return hue;
  }

  return ((hue % 360) + 360) % 360;
}
