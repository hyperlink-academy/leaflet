import type { Node } from "prosemirror-model";

export type Match = { blockID: string; from: number; to: number };
export type SearchOptions = { caseSensitive: boolean; wholeWord: boolean };

export const PLACEHOLDER = "￼";

function isWordChar(c: string | undefined) {
  return c !== undefined && /\w/.test(c);
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isWholeWordMatch(text: string, start: number, end: number) {
  return !isWordChar(text[start - 1]) && !isWordChar(text[end]);
}

export function* matchRanges(
  text: string,
  query: string,
  options: SearchOptions,
): Generator<{ start: number; end: number }> {
  if (!query) return;
  let re = new RegExp(escapeRegExp(query), options.caseSensitive ? "g" : "gi");
  for (let m of text.matchAll(re)) {
    let start = m.index;
    let end = start + m[0].length;
    if (end === start) continue;
    if (options.wholeWord && !isWholeWordMatch(text, start, end)) continue;
    yield { start, end };
  }
}

export function textHasMatch(
  text: string,
  query: string,
  options: SearchOptions,
) {
  for (let _ of matchRanges(text, query, options)) return true;
  return false;
}

type Segment = { strStart: number; docPos: number };

export function flattenDoc(doc: Node) {
  let text = "";
  let segments: Segment[] = [];
  doc.descendants((node, pos) => {
    if (node.isText) {
      segments.push({ strStart: text.length, docPos: pos });
      text += node.text ?? "";
      return false;
    }
    if (node.isInline || node.isLeaf) {
      segments.push({ strStart: text.length, docPos: pos });
      text += PLACEHOLDER;
      return false;
    }
    return true;
  });
  return { text, segments };
}

function docPosAt(segments: Segment[], strIndex: number) {
  let lo = 0,
    hi = segments.length - 1,
    found = 0;
  while (lo <= hi) {
    let mid = (lo + hi) >> 1;
    if (segments[mid].strStart <= strIndex) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  let seg = segments[found];
  return seg.docPos + (strIndex - seg.strStart);
}

export function findMatchesInDoc(
  doc: Node,
  query: string,
  options: SearchOptions,
): { from: number; to: number }[] {
  if (!query) return [];
  let { text, segments } = flattenDoc(doc);
  if (segments.length === 0) return [];
  let out: { from: number; to: number }[] = [];
  for (let { start, end } of matchRanges(text, query, options)) {
    out.push({
      from: docPosAt(segments, start),
      to: docPosAt(segments, end - 1) + 1,
    });
  }
  return out;
}

export function sameMatches(a: Match[], b: Match[]) {
  return (
    a.length === b.length &&
    a.every(
      (m, i) =>
        m.blockID === b[i].blockID && m.from === b[i].from && m.to === b[i].to,
    )
  );
}
