import type { PubLeafletPagesLinearDocument } from "lexicons/api";

// The lexicon block union (BlockLexicons in lexicons/src/blocks.ts) ends in a
// `{ $type: string }` catch-all, so a renderer's switch over `isMain` guards
// can silently skip a type and TypeScript can't tell. Every surface that
// consumes published blocks (published page, feed, email) should instead
// build a `BlockHandlers` map and dispatch through `matchBlock`: adding a
// block type to the lexicon (+ `npm run lexgen`) then breaks compilation in
// each surface until it is handled — or visibly opted out of — there.
//
// Everything here derives from the generated union, so there is no list to
// maintain; blockDispatch.test.ts compares the generated schemas back to
// lexicons/src, catching a src edit made without running lexgen.

// Keeps only the union members with a literal $type, dropping the
// `{ $type: string }` catch-all that stands in for other apps' blocks.
export type LiteralTyped<U> = U extends { $type: string }
  ? string extends U["$type"]
    ? never
    : U
  : never;

type KnownBlock = LiteralTyped<PubLeafletPagesLinearDocument.Block["block"]>;

export type BlockTypeMap = { [M in KnownBlock as M["$type"]]: M };

export type KnownBlockType = keyof BlockTypeMap;

// One handler per known block type. To skip a type on a surface, give it an
// explicit handler returning the surface's "nothing" value — that reads as a
// decision, where a missing switch case reads as nothing at all.
export type BlockHandlers<R> = {
  [K in KnownBlockType]: (block: BlockTypeMap[K]) => R;
};

// Dispatch on the exact $type string — the same match `is$typed(v, id,
// "main")` performs, so this is behavior-identical to an isMain switch.
// `unknown` handles blocks authored by other AT-Proto apps (or newer Leaflet
// versions) whose $type we don't know; it must not throw.
export function matchBlock<R>(
  block: { $type: string },
  handlers: BlockHandlers<R>,
  unknown: (block: { $type: string }) => R,
): R {
  // Own-property check: $type comes from records other apps author, and a
  // $type like "toString" or "__proto__" would otherwise find an inherited
  // Object.prototype member and crash the whole render.
  if (!Object.prototype.hasOwnProperty.call(handlers, block.$type)) {
    return unknown(block);
  }
  const handler = (
    handlers as unknown as Record<string, (b: { $type: string }) => R>
  )[block.$type];
  return handler(block);
}
