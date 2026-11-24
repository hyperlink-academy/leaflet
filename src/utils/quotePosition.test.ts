import { expect, test } from "vitest";
import {
  compareQuoteBlockPaths,
  decodeQuotePosition,
  encodeQuotePosition,
} from "./quotePosition";

test("table cell quote paths stay in document order across row boundaries", () => {
  const start = { block: [2, 0, 2], offset: 1 };
  const end = { block: [2, 1, 0], offset: 4 };
  const position = { pageId: "page", start, end };
  expect(decodeQuotePosition(encodeQuotePosition(position))).toEqual(position);
  const inRange = [
    [2, 0, 1],
    [2, 0, 2],
    [2, 0, 3],
    [2, 1, 0],
    [2, 1, 1],
  ].filter(
    (path) =>
      compareQuoteBlockPaths(path, start.block) >= 0 &&
      compareQuoteBlockPaths(path, end.block) <= 0,
  );
  expect(inRange).toEqual([
    [2, 0, 2],
    [2, 0, 3],
    [2, 1, 0],
  ]);
});
