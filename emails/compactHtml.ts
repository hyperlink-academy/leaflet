// Gmail clips a message past ~102KB of HTML, hiding everything after the cut
// (images included) behind "View entire message", so long posts need every
// byte. Inline styles are most of an email's weight, and the components
// emitting them repeat declarations a browser would discard anyway. Each
// rewrite here leaves every element's computed style unchanged.
export function compactEmailHtml(html: string): string {
  return (
    html
      // React 19 hoists a preload hint for every <img> into <head>; mail
      // clients don't act on it.
      .replace(/<link rel="preload" as="image"[^>]*>/g, "")
      .replace(
        / style="([^"]*)"/g,
        (_, style: string) =>
          ` style="${encodeAttr(compactStyle(decodeAttr(style)))}"`,
      )
  );
}

const SIDES = ["top", "right", "bottom", "left"] as const;

function compactStyle(style: string): string {
  let decls = splitDeclarations(style).map(([prop, value]) => [
    prop,
    value.includes("url(") ? value : value.replace(RGB, rgbToHex),
  ]);

  // react-email's Text expands its margin into all four longhands after the
  // shorthand; they restate the shorthand exactly.
  for (const box of ["margin", "padding"]) {
    const shorthand = decls.findLastIndex(([p]) => p === box);
    if (shorthand === -1) continue;
    const sides = expandBox(decls[shorthand][1]);
    if (!sides) continue;
    decls = decls.filter(
      ([p, v], i) =>
        !(
          i > shorthand &&
          SIDES.some((side, s) => p === `${box}-${side}` && v === sides[s])
        ),
    );
  }

  // react-email's Link sets text-decoration-line before our text-decoration,
  // a shorthand that resets it.
  const decoration = decls.findLastIndex(([p]) => p === "text-decoration");
  decls = decls.filter(
    ([p], i) => !(p === "text-decoration-line" && i < decoration),
  );

  return decls.map(([p, v]) => `${p}:${v}`).join(";");
}

// Splits on semicolons outside parentheses and quotes, so values like
// url("data:image/png;base64,...") survive.
function splitDeclarations(style: string): [string, string][] {
  const decls: [string, string][] = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  const push = (end: number) => {
    const decl = style.slice(start, end);
    const colon = decl.indexOf(":");
    if (colon !== -1)
      decls.push([decl.slice(0, colon).trim(), decl.slice(colon + 1).trim()]);
    start = end + 1;
  };
  for (let i = 0; i < style.length; i++) {
    const ch = style[i];
    if (quote) {
      if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === ";" && depth === 0) push(i);
  }
  push(style.length);
  return decls;
}

function expandBox(value: string): string[] | null {
  const parts = value.split(/\s+/);
  const [t, r = t, b = t, l = r] = parts;
  return parts.length > 4 ? null : [t, r, b, l];
}

const RGB = /rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/g;

function rgbToHex(match: string, ...channels: string[]) {
  const values = channels.slice(0, 3).map(Number);
  if (values.some((v) => v > 255)) return match;
  return `#${values.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function decodeAttr(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function encodeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
