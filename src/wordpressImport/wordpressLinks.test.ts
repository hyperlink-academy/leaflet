import { describe, expect, test } from "vitest";
import { wordpressLinkRewriter, wordpressPermalinks } from "./wordpressLinks";

describe("wordpressLinkRewriter", () => {
  const rewrite = wordpressLinkRewriter(
    wordpressPermalinks([
      {
        slug: "miso",
        link: "https://www.blog.example.com/2025/07/miso/",
        guid: "https://blog.example.com/?p=12",
      },
    ]),
    "https://new.example/",
  );

  test("points links to imported posts at their copies", () => {
    expect(rewrite("https://blog.example.com/2025/07/miso")).toBe(
      "https://new.example/miso",
    );
    expect(rewrite("http://www.blog.example.com/2025/07/miso/#recipe")).toBe(
      "https://new.example/miso#recipe",
    );
    expect(rewrite("https://blog.example.com/?p=12")).toBe(
      "https://new.example/miso",
    );
  });

  test("leaves every other link alone", () => {
    for (const href of [
      "https://blog.example.com/2025/07/other/",
      "https://elsewhere.com/2025/07/miso/",
      "#top",
      "mailto:me@example.com",
    ])
      expect(rewrite(href)).toBe(href);
  });
});
