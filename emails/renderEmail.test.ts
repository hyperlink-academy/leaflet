import { describe, expect, it } from "vitest";
import { createElement as h } from "react";
import { renderEmail } from "./renderEmail";

describe("renderEmail", () => {
  it("drops React's image preload hints and keeps the images", async () => {
    const html = await renderEmail(
      h(
        "html",
        null,
        h("head"),
        h(
          "body",
          null,
          h("img", { src: "https://example.com/a.png?b=1&c=2", alt: "" }),
        ),
      ),
    );
    expect(html).not.toContain('rel="preload"');
    expect(html).toContain('src="https://example.com/a.png?b=1&amp;c=2"');
  });
});
