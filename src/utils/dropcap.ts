// Mirrors what CSS ::first-letter styles: the first typographic letter unit
// (one grapheme) plus any punctuation hugging it, so the editor's decoration
// and the email's span cover the same characters the published page's
// ::first-letter does.
const HUGGING_PUNCTUATION = /^[\p{Ps}\p{Pe}\p{Pi}\p{Pf}\p{Po}]+/u;

function firstGraphemeLength(text: string) {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    let segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    let first = segmenter.segment(text)[Symbol.iterator]().next().value;
    return first ? first.segment.length : 0;
  }
  let codepoint = text.codePointAt(0);
  return codepoint === undefined ? 0 : codepoint > 0xffff ? 2 : 1;
}

/** Length in UTF-16 code units of the leading run a drop cap should cover; 0 when there is nothing to enlarge. */
export function dropcapLength(text: string): number {
  let leading = HUGGING_PUNCTUATION.exec(text)?.[0].length ?? 0;
  let rest = text.slice(leading);
  if (!rest || /^\s/.test(rest)) return 0;
  let letter = firstGraphemeLength(rest);
  let trailing = HUGGING_PUNCTUATION.exec(rest.slice(letter))?.[0].length ?? 0;
  return leading + letter + trailing;
}
