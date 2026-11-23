import { describe, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { renderEmail } from "./renderEmail";
import { PostEmail } from "./post";

vi.mock("supabase/serverClient", () => ({ supabaseServerClient: {} }));

describe("renderEmail", () => {
  it("keeps semantic table headers and wraps cells within the email column", async () => {
    const html = await renderEmail(
      PostEmail({
        blocks: [
          {
            block: {
              $type: "pub.leaflet.blocks.table",
              headerRow: true,
              borders: false,
              columnAlignments: ["left", "right"],
              rows: [
                { cells: [{ plaintext: "Item" }, { plaintext: "Cost" }] },
                { cells: [{ plaintext: "Bolt" }, { plaintext: "$5" }] },
              ],
            },
          },
        ],
      }),
    );
    expect(html).toContain("table-layout:fixed");
    expect(html).toContain('scope="col"');
    expect(html).toContain("word-break:break-word");
    expect(html).toContain("text-align:right");
    expect(html).toContain("Bolt");
  });
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
