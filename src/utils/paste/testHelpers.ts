import { readFileSync } from "fs";
import { join } from "path";
import type { Mark } from "prosemirror-model";
import type { BuildResult, BuiltBlock } from "./htmlToBlocks";
import { buildBlocksFromPasteHTML } from "./htmlToBlocks";

const TEST_PARENT = "test-parent-entity";
const TEST_PERMISSION_SET = "test-permission-set";

export type BlockSummary = {
  type: string;
  // Wherever the block keeps its content: parsed inline content for text-ish
  // blocks, the corresponding fact for code/math/button.
  text: string;
  depth: number;
  marks: string[];
  links: string[];
  isList: boolean;
  checked?: boolean;
  headingLevel?: number;
  listStyle?: "ordered" | "unordered";
  codeLanguage?: string;
  alignment?: string;
  textSize?: string;
  imageURL?: string;
  buttonURL?: string;
};

// Blocks whose text lives in a fact rather than in parsed inline content.
const TEXT_FACT: Record<string, string> = {
  code: "block/code",
  math: "block/math",
  button: "button/text",
};

export const fixture = (name: string) =>
  readFileSync(join(__dirname, "__fixtures__", name), "utf-8");

export const build = (html: string): BuildResult =>
  buildBlocksFromPasteHTML(html, {
    parent: TEST_PARENT,
    permission_set: TEST_PERMISSION_SET,
  });

export const paste = (html: string) => summarize(build(html));

export const pasteFixture = (name: string) => paste(fixture(name));

export function blockStartingWith(blocks: BlockSummary[], prefix: string) {
  const block = blocks.find((b) => b.text.startsWith(prefix));
  if (!block)
    throw new Error(`no block starting with ${JSON.stringify(prefix)}`);
  return block;
}

// Compact "type: text" outline, the form most assertions read against.
export function outline(blocks: BlockSummary[]): string[] {
  return blocks.map((b) => {
    const check = b.checked === undefined ? "" : b.checked ? "[x]" : "[ ]";
    const label = b.isList
      ? `${b.listStyle === "ordered" ? "ol" : "ul"}-li${check}`
      : b.type === "heading"
        ? `h${b.headingLevel}`
        : b.type;
    return `${"  ".repeat(b.depth)}${label}: ${b.text}`;
  });
}

function summarize(result: BuildResult): BlockSummary[] {
  const byID = new Map(result.blocks.map((b) => [b.entityID, b]));
  const imageByEntity = new Map(
    result.imageTasks.map((t) => [t.entityID, t.url]),
  );

  // Nesting isn't stored on the block; it's the length of the parent chain up
  // to the block the paste was dropped into.
  const depthOf = (block: BuiltBlock) => {
    let depth = 0;
    let cursor: BuiltBlock | undefined = block;
    while (cursor && cursor.parent !== TEST_PARENT) {
      cursor = byID.get(cursor.parent);
      if (cursor) depth++;
    }
    return depth;
  };

  return result.blocks.map((b) => {
    const marks = inlineMarks(b);
    return {
      type: b.type,
      text: TEXT_FACT[b.type]
        ? factValue(b, TEXT_FACT[b.type]) ?? ""
        : b.parsedContent?.textContent ?? "",
      depth: depthOf(b),
      marks: unique(marks.map((m) => m.type.name)),
      links: unique(
        marks.filter((m) => m.type.name === "link").map((m) => m.attrs.href),
      ),
      isList: !!factValue(b, "block/is-list"),
      checked: factValue(b, "block/check-list"),
      headingLevel: factValue(b, "block/heading-level"),
      listStyle: factValue(b, "block/list-style"),
      codeLanguage: factValue(b, "block/code-language"),
      alignment: factValue(b, "block/text-alignment"),
      textSize: factValue(b, "block/text-size"),
      imageURL: imageByEntity.get(b.entityID),
      buttonURL: factValue(b, "button/url"),
    };
  });
}

function factValue(block: BuiltBlock, attribute: string) {
  const fact = block.facts.find((f) => f.attribute === attribute);
  return fact ? (fact.data as any).value : undefined;
}

// Every mark on the block's parsed inline content, in document order. Marks are
// what the word-processor fixtures mostly exercise — bold/italic/underline/
// strike/link surviving the trip through the clipboard.
function inlineMarks(block: BuiltBlock): Mark[] {
  const marks: Mark[] = [];
  block.parsedContent?.descendants((node) => {
    marks.push(...node.marks);
    return true;
  });
  return marks;
}

const unique = <T>(values: T[]) => Array.from(new Set(values));
