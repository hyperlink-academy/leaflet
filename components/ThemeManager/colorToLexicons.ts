import { Color } from "react-aria-components";

export function ColorToRGBA(color: Color) {
  if (!color)
    return {
      $type: "pub.leaflet.theme.color#rgba" as const,
      r: 0,
      g: 0,
      b: 0,
      a: 1,
    };
  let c = color.toFormat("rgba");
  const r = c.getChannelValue("red");
  const g = c.getChannelValue("green");
  const b = c.getChannelValue("blue");
  const a = c.getChannelValue("alpha");
  return {
    $type: "pub.leaflet.theme.color#rgba" as const,
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
    a: Math.round(a * 100),
  };
}

export function ColorToRGB(color: Color) {
  if (!color)
    return {
      $type: "pub.leaflet.theme.color#rgb" as const,
      r: 0,
      g: 0,
      b: 0,
    };
  let c = color.toFormat("rgb");
  const r = c.getChannelValue("red");
  const g = c.getChannelValue("green");
  const b = c.getChannelValue("blue");
  return {
    $type: "pub.leaflet.theme.color#rgb" as const,
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
  };
}
