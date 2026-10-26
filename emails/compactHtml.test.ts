import { describe, expect, it } from "vitest";
import { compactEmailHtml } from "./compactHtml";

const styleOf = (html: string) => /style="([^"]*)"/.exec(html)?.[1];

describe("compactEmailHtml", () => {
  it("drops image preload hints", () => {
    expect(
      compactEmailHtml(
        '<head><link rel="preload" as="image" href="https://x/a.png?b=1&amp;c=2"/><meta charset="utf-8"/></head>',
      ),
    ).toBe('<head><meta charset="utf-8"/></head>');
  });

  it("writes rgb() colors as hex", () => {
    expect(
      styleOf(
        compactEmailHtml(
          '<p style="color:rgb(39, 39, 39);border:1px solid rgb(0,128,255)">',
        ),
      ),
    ).toBe("color:#272727;border:1px solid #0080ff");
  });

  it("leaves rgba() and colors inside url() alone", () => {
    const html =
      '<td style="background-color:rgba(0,0,0,0.06);background-image:url(https://x/a.png?c=rgb(1, 2, 3))">';
    expect(styleOf(compactEmailHtml(html))).toBe(
      "background-color:rgba(0,0,0,0.06);background-image:url(https://x/a.png?c=rgb(1, 2, 3))",
    );
  });

  it("drops longhands that restate the shorthand", () => {
    expect(
      styleOf(
        compactEmailHtml(
          '<p style="margin:4px 0 16px;margin-top:4px;margin-right:0;margin-bottom:16px;margin-left:0">',
        ),
      ),
    ).toBe("margin:4px 0 16px");
  });

  it("keeps longhands that override the shorthand", () => {
    expect(
      styleOf(
        compactEmailHtml(
          '<p style="margin:4px 0;margin-top:8px;margin-bottom:4px;padding:2px;padding-left:2px">',
        ),
      ),
    ).toBe("margin:4px 0;margin-top:8px;padding:2px");
  });

  it("drops a text-decoration-line overridden by text-decoration", () => {
    expect(
      styleOf(
        compactEmailHtml(
          '<a style="color:red;text-decoration-line:none;text-decoration:underline">',
        ),
      ),
    ).toBe("color:red;text-decoration:underline");
    expect(
      styleOf(compactEmailHtml('<a style="text-decoration-line:none">')),
    ).toBe("text-decoration-line:none");
  });

  it("round-trips quoted font names and semicolons inside values", () => {
    const html =
      '<p style="font-family:&quot;Open Sans&quot;, sans-serif;background:url(&quot;data:image/png;base64,AA==&quot;)">';
    expect(compactEmailHtml(html)).toBe(html);
  });
});
