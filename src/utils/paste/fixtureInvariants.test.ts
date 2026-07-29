// @vitest-environment jsdom
//
// Invariants that must hold for *any* clipboard payload, checked against every
// fixture — including real captures dropped into __fixtures__/captured/, whose
// exact block outline isn't known ahead of time. "Don't lose the document" and
// "don't emit stylesheet text" always apply.
import { expect, test } from "vitest";
import { readdirSync } from "fs";
import { join } from "path";
import { fixture, paste } from "./testHelpers";

const htmlIn = (dir: string) =>
  readdirSync(join(__dirname, "__fixtures__", dir))
    .filter((f) => f.endsWith(".html"))
    .map((f) => join(dir, f));

const cases = [...htmlIn("."), ...htmlIn("captured")].map((file) => {
  const html = fixture(file);
  return {
    file,
    blocks: paste(html),
    sourceBlockCount: new DOMParser()
      .parseFromString(html, "text/html")
      .body.querySelectorAll(
        "p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, img, hr",
      ).length,
  };
});

test.each(cases)("$file: does not collapse the document", (c) => {
  expect(c.blocks.length).toBeGreaterThan(0);
  if (c.sourceBlockCount >= 3) expect(c.blocks.length).toBeGreaterThan(1);
});

test.each(cases)("$file: never emits stylesheet or script text", (c) => {
  for (const block of c.blocks) {
    if (block.type === "code") continue;
    expect(block.text).not.toMatch(/font-family\s*:/);
    expect(block.text).not.toMatch(/@font-face/);
    expect(block.text).not.toMatch(/\bmso-[a-z-]+\s*:/);
    expect(block.text).not.toMatch(/\{[^}]*:[^}]*\}/);
  }
});

test.each(cases)("$file: no list item keeps a literal bullet marker", (c) => {
  for (const block of c.blocks) {
    if (!block.isList) continue;
    expect(block.text).not.toMatch(/^\s*[·•▪◦§o]\s/);
    expect(block.text).not.toMatch(/^\s*\d+[.)]\s/);
  }
});
