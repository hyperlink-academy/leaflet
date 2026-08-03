// Word processors put a lot of their document structure somewhere other than
// the HTML element tree: Word encodes lists as flat paragraphs tagged with an
// `mso-list` style, Word Online splits one list across sibling <ul>s and
// encodes depth in aria-level, Apple's Cocoa HTML Writer puts bold/underline in
// a <style> block keyed by class, and Google Docs nests a <ul> as a *sibling*
// of the <li> it belongs to. This module rewrites those dialects into ordinary
// HTML before the paste flattener runs, so the flattener only has to understand
// one shape.

const MARK_STYLE_PROPS = [
  "font-weight",
  "font-style",
  "text-decoration",
  "text-decoration-line",
];

// Elements whose text content is not document content.
const NON_CONTENT_TAGS =
  "style, script, noscript, template, link, meta, title, base";

const BLOCK_TAGS_SELECTOR =
  "p, div, h1, h2, h3, h4, h5, h6, blockquote, pre, ul, ol, li";

const BLOCK_TAGS = new Set([
  "P",
  "DIV",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "BLOCKQUOTE",
  "PRE",
  "UL",
  "OL",
  "LI",
  "TABLE",
  "IMG",
  "HR",
  "FIGURE",
]);

export function normalizePastedHTML(root: HTMLElement) {
  const doc = root.ownerDocument;
  extractFootnotes(root);
  inlineStylesheetMarks(root, doc);
  doc.querySelectorAll(NON_CONTENT_TAGS).forEach((el) => el.remove());
  removeWordParagraphMarks(root);
  normalizeWordQuoteParagraphs(root);
  normalizeWordListParagraphs(root);
  nestSiblingLists(root);
  normalizeTaskListItems(root);
  expandMultiBlockQuotes(root);
  flattenTables(root);
}

// Word's Quote / Intense Quote styles are ordinary paragraphs tagged by class;
// nothing else in the markup says "this is a quotation".
function normalizeWordQuoteParagraphs(root: HTMLElement) {
  const doc = root.ownerDocument;
  for (const p of Array.from(
    root.querySelectorAll("p.MsoQuote, p.MsoIntenseQuote"),
  )) {
    const quote = doc.createElement("blockquote");
    while (p.firstChild) quote.appendChild(p.firstChild);
    p.replaceWith(quote);
  }
}

// A blockquote holding more than one block can't be represented — Leaflet's
// blockquote is a single text block, and the editor's DOM parser silently keeps
// only the first block it finds inside. Split such a quote into one block per
// child instead: paragraphs (and nested quotes) stay quoted, everything else
// keeps its own type. Innermost first, so nested quotes are already flat by the
// time their parent is processed.
function expandMultiBlockQuotes(root: HTMLElement) {
  const doc = root.ownerDocument;
  for (const quote of Array.from(
    root.querySelectorAll("blockquote"),
  ).reverse()) {
    const children = Array.from(quote.childNodes);
    const blockCount = children.filter(
      (n) =>
        n.nodeType === Node.ELEMENT_NODE &&
        BLOCK_TAGS.has((n as Element).tagName),
    ).length;
    if (blockCount < 2) continue;

    const replacements: Node[] = [];
    let inlineRun: Node[] = [];
    const flushInlineRun = () => {
      if (inlineRun.some((n) => n.textContent?.trim())) {
        const wrapper = doc.createElement("blockquote");
        for (const n of inlineRun) wrapper.appendChild(n);
        replacements.push(wrapper);
      }
      inlineRun = [];
    };

    for (const node of children) {
      const el = node as HTMLElement;
      if (node.nodeType !== Node.ELEMENT_NODE || !BLOCK_TAGS.has(el.tagName)) {
        inlineRun.push(node);
        continue;
      }
      flushInlineRun();
      if (el.tagName === "P" || el.tagName === "BLOCKQUOTE") {
        const wrapper = doc.createElement("blockquote");
        while (el.firstChild) wrapper.appendChild(el.firstChild);
        replacements.push(wrapper);
      } else {
        replacements.push(el);
      }
    }
    flushInlineRun();
    quote.replaceWith(...replacements);
  }
}

// Markdown renderers keep footnotes apart from where they're read: a numbered
// ref link in the text pointing at a definition list at the bottom of the
// document (GFM's <section data-footnotes>, python-markdown's
// <div class="footnotes">, pandoc's <section class="footnotes">). Replace each
// ref with a span carrying its definition's HTML (data-footnote-def) and drop
// the section, so the block builder can mint footnote entities instead of
// pasting the definitions as a trailing numbered list.
const FOOTNOTE_SECTION_SELECTOR =
  "section[data-footnotes], section.footnotes, div.footnotes";

const FOOTNOTE_BACKREF_SELECTOR =
  '[data-footnote-backref], .footnote-backref, .footnote-back, [role="doc-backlink"]';

function extractFootnotes(root: HTMLElement) {
  const doc = root.ownerDocument;
  const sections = Array.from(root.querySelectorAll(FOOTNOTE_SECTION_SELECTOR));
  if (sections.length === 0) return;

  const definitions = new Map<string, HTMLElement>();
  for (const s of sections)
    for (const li of Array.from(s.querySelectorAll("li[id]")))
      definitions.set(li.id, li as HTMLElement);

  for (const anchor of Array.from(root.querySelectorAll('a[href^="#"]'))) {
    // Anything inside a section is a backref or a ref within a definition, not
    // a ref to mark; the whole section is removed below.
    if (anchor.closest(FOOTNOTE_SECTION_SELECTOR)) continue;
    const id = safeDecodeURIComponent(anchor.getAttribute("href")!.slice(1));
    const definition = definitions.get(id);
    if (!definition) continue;
    const span = doc.createElement("span");
    span.setAttribute(
      "data-footnote-def",
      cleanDefinitionHTML(definition, definitions),
    );
    span.textContent = anchor.textContent || "";
    // GFM and python-markdown wrap the ref anchor in a <sup>; pandoc puts the
    // <sup> inside the anchor. Replace whichever element is the whole marker.
    const parent = anchor.parentElement;
    if (parent?.tagName === "SUP" && parent.childNodes.length === 1)
      parent.replaceWith(span);
    else anchor.replaceWith(span);
  }
  for (const section of sections) section.remove();
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function cleanDefinitionHTML(
  li: HTMLElement,
  definitions: Map<string, HTMLElement>,
): string {
  const doc = li.ownerDocument;
  const clone = li.cloneNode(true) as HTMLElement;
  for (const backref of Array.from(
    clone.querySelectorAll(FOOTNOTE_BACKREF_SELECTOR),
  )) {
    // python-markdown glues the backref on with an &nbsp;, which the editor's
    // parser preserves as content.
    const prev = backref.previousSibling;
    if (prev?.nodeType === Node.TEXT_NODE)
      prev.textContent = prev.textContent!.replace(/\s+$/, "");
    backref.remove();
  }
  // A footnote referenced from inside another footnote's definition can't be
  // represented; keep its marker text.
  for (const anchor of Array.from(clone.querySelectorAll('a[href^="#"]'))) {
    const id = safeDecodeURIComponent(anchor.getAttribute("href")!.slice(1));
    if (definitions.has(id))
      anchor.replaceWith(doc.createTextNode(anchor.textContent || ""));
  }
  return clone.innerHTML;
}

// GFM task lists (and the checklists Notion/GitHub put on the clipboard) mark
// state with a checkbox input; Leaflet stores it on the block instead.
function normalizeTaskListItems(root: HTMLElement) {
  for (const li of Array.from(root.querySelectorAll("li"))) {
    const checkbox = li.querySelector("input[type=checkbox]");
    // Only the item's own marker counts — a checkbox belonging to a nested
    // item is that item's business.
    if (!checkbox || checkbox.closest("li") !== li) continue;
    li.setAttribute("data-checked", String(checkbox.hasAttribute("checked")));
    checkbox.remove();
    trimLeadingWhitespace(li);
  }
}

// Fold the mark-carrying declarations of any <style> rule into the matching
// elements' style attributes. ProseMirror's DOMParser only ever looks at the
// style *attribute*, so class-driven bold/italic/underline (Apple Notes, Pages,
// TextEdit, and any copied web page with a stylesheet) is otherwise invisible.
function inlineStylesheetMarks(root: HTMLElement, doc: Document) {
  for (const styleEl of Array.from(doc.querySelectorAll("style"))) {
    for (const rule of parseCSSRules(styleEl.textContent || "")) {
      const decls = parseDeclarations(rule.decls);
      const relevant = MARK_STYLE_PROPS.filter((p) => decls.has(p));
      if (relevant.length === 0) continue;
      let targets: NodeListOf<Element>;
      try {
        targets = root.querySelectorAll(rule.selector);
      } catch {
        continue; // Word emits selectors that aren't valid CSS3
      }
      for (const el of Array.from(targets)) {
        const existing = el.getAttribute("style") || "";
        // An inline declaration always wins over the stylesheet, so only add
        // properties the element doesn't already set itself.
        const additions = relevant
          .filter((p) => !new RegExp(`(^|;)\\s*${p}\\s*:`, "i").test(existing))
          .map((p) => `${p}:${decls.get(p)}`);
        if (additions.length === 0) continue;
        el.setAttribute(
          "style",
          additions.join(";") + (existing ? ";" + existing : ""),
        );
      }
    }
  }
}

function parseCSSRules(
  css: string,
): Array<{ selector: string; decls: string }> {
  const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--|-->/g, "");
  const rules: Array<{ selector: string; decls: string }> = [];
  let i = 0;
  while (i < cleaned.length) {
    const open = cleaned.indexOf("{", i);
    if (open === -1) break;
    const selector = cleaned.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < cleaned.length && depth > 0) {
      if (cleaned[j] === "{") depth++;
      else if (cleaned[j] === "}") depth--;
      j++;
    }
    const body = cleaned.slice(open + 1, j - 1);
    if (selector.startsWith("@")) {
      // Conditional groups still contain ordinary rules; @font-face and friends
      // never carry marks.
      if (/^@(media|supports|layer|scope)\b/i.test(selector))
        rules.push(...parseCSSRules(body));
    } else if (selector) {
      rules.push({ selector, decls: body });
    }
    i = j;
  }
  return rules;
}

function parseDeclarations(decls: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const decl of decls.split(";")) {
    const colon = decl.indexOf(":");
    if (colon === -1) continue;
    const prop = decl.slice(0, colon).trim().toLowerCase();
    const value = decl.slice(colon + 1).trim();
    if (prop && value) out.set(prop, value);
  }
  return out;
}

// <o:p> only ever holds Word's paragraph mark (an empty string or a single
// non-breaking space); keeping it turns every blank Word line into a block of
// whitespace.
function removeWordParagraphMarks(root: HTMLElement) {
  for (const el of Array.from(root.getElementsByTagName("*"))) {
    if (el.tagName === "O:P") el.remove();
  }
}

// Word (desktop) writes lists as flat <p> runs carrying `mso-list:lN levelM`,
// with the bullet or number as literal text inside an ignorable span. Rebuild
// the real <ul>/<ol> tree from the level numbers.
function normalizeWordListParagraphs(root: HTMLElement) {
  const paragraphs = Array.from(root.querySelectorAll("p")).filter((p) =>
    /mso-list\s*:\s*l\d+\s+level\d+/i.test(p.getAttribute("style") || ""),
  );
  if (paragraphs.length === 0) return;

  const runs: HTMLElement[][] = [];
  for (const p of paragraphs) {
    const current = runs[runs.length - 1];
    const previous = current?.[current.length - 1];
    if (
      previous &&
      previous.parentNode === p.parentNode &&
      isNextContent(previous, p)
    )
      current.push(p);
    else runs.push([p]);
  }
  for (const run of runs) rebuildWordList(run);
}

// Word separates list paragraphs with whitespace and conditional comments.
function isNextContent(from: Node, to: Node): boolean {
  let cursor = from.nextSibling;
  while (cursor) {
    if (cursor === to) return true;
    const isIgnorable =
      cursor.nodeType === Node.COMMENT_NODE ||
      (cursor.nodeType === Node.TEXT_NODE && !cursor.textContent?.trim());
    if (!isIgnorable) return false;
    cursor = cursor.nextSibling;
  }
  return false;
}

function rebuildWordList(run: HTMLElement[]) {
  const doc = run[0].ownerDocument;
  const parent = run[0].parentNode;
  if (!parent) return;

  const items = run.map((p) => {
    const style = p.getAttribute("style") || "";
    const level = parseInt(style.match(/level(\d+)/i)?.[1] || "1", 10);
    const marker = stripWordListMarker(p);
    const li = doc.createElement("li");
    while (p.firstChild) li.appendChild(p.firstChild);
    trimLeadingWhitespace(li);
    // A numeric/alphabetic marker with a trailing separator is an ordered list;
    // Word's bullets are Symbol/Wingdings glyphs with no separator.
    const ordered = /^[0-9]+[.)]|^[a-z][.)]|^[ivxlcdm]+[.)]/i.test(
      marker.trim(),
    );
    return { level, ordered, li };
  });

  const rootList = doc.createElement(items[0].ordered ? "ol" : "ul");
  const stack = [{ level: items[0].level, list: rootList }];
  let lastItem: HTMLElement | null = null;
  for (const item of items) {
    while (stack.length > 1 && item.level < stack[stack.length - 1].level)
      stack.pop();
    if (item.level > stack[stack.length - 1].level) {
      const sublist = doc.createElement(item.ordered ? "ol" : "ul");
      (lastItem || stack[stack.length - 1].list).appendChild(sublist);
      stack.push({ level: item.level, list: sublist });
    }
    stack[stack.length - 1].list.appendChild(item.li);
    lastItem = item.li;
  }

  parent.insertBefore(rootList, run[0]);
  for (const p of run) p.remove();
}

// Returns the marker text (used to tell ordered from unordered) and removes it.
function stripWordListMarker(p: HTMLElement): string {
  let marker = "";
  for (const el of Array.from(p.querySelectorAll("[style]"))) {
    if (/mso-list\s*:\s*ignore/i.test(el.getAttribute("style") || "")) {
      marker += el.textContent || "";
      el.remove();
    }
  }
  // Older Word output brackets the marker with `<![if !supportLists]>` …
  // `<![endif]>` conditional comments instead of tagging it mso-list:Ignore.
  const doomed: Node[] = [];
  let inMarker = false;
  for (const node of Array.from(p.childNodes)) {
    if (node.nodeType === Node.COMMENT_NODE) {
      const data = node.textContent?.trim() || "";
      if (/^\[if\s+!supportLists\]$/i.test(data)) inMarker = true;
      else if (/^\[endif\]$/i.test(data)) inMarker = false;
      doomed.push(node);
      continue;
    }
    if (inMarker) {
      marker += node.textContent || "";
      doomed.push(node);
    }
  }
  for (const node of doomed) node.parentNode?.removeChild(node);
  return marker;
}

function trimLeadingWhitespace(el: HTMLElement) {
  while (el.firstChild) {
    const first = el.firstChild;
    if (first.nodeType === Node.TEXT_NODE) {
      const trimmed = (first.textContent || "").replace(/^\s+/, "");
      if (trimmed) {
        first.textContent = trimmed;
        return;
      }
      el.removeChild(first);
      continue;
    }
    if (first.nodeType === Node.ELEMENT_NODE && !first.textContent?.trim()) {
      el.removeChild(first);
      continue;
    }
    return;
  }
}

// Google Docs emits `<ul><li>a</li><ul><li>b</li></ul></ul>` — the nested list
// is a sibling of the item it belongs to rather than its child.
function nestSiblingLists(root: HTMLElement) {
  for (const list of Array.from(root.querySelectorAll("ul, ol"))) {
    const parent = list.parentElement;
    if (!parent || (parent.tagName !== "UL" && parent.tagName !== "OL"))
      continue;
    let previous = list.previousElementSibling;
    while (previous && previous.tagName !== "LI")
      previous = previous.previousElementSibling;
    if (previous) previous.appendChild(list);
  }
}

// A table has no block representation, so each row becomes one text block whose
// cells are separated by CELL_SEPARATOR. It has to be a visible character: the
// editor's DOM parser collapses tabs and runs of spaces, so anything else loses
// the cell boundaries entirely. Innermost tables first, so nested tables
// collapse cleanly.
const CELL_SEPARATOR = " | ";

function flattenTables(root: HTMLElement) {
  const doc = root.ownerDocument;
  for (const table of Array.from(root.querySelectorAll("table")).reverse()) {
    const fragment = doc.createDocumentFragment();
    for (const row of Array.from(table.querySelectorAll("tr"))) {
      const paragraph = doc.createElement("p");
      const cells = Array.from(row.children).filter(
        (c) => c.tagName === "TD" || c.tagName === "TH",
      );
      cells.forEach((cell, index) => {
        if (index > 0)
          paragraph.appendChild(doc.createTextNode(CELL_SEPARATOR));
        unwrapBlockDescendants(cell);
        while (cell.firstChild) paragraph.appendChild(cell.firstChild);
      });
      fragment.appendChild(paragraph);
    }
    table.replaceWith(fragment);
  }
}

// Cells usually wrap their text in <p>/<div>; a row has to end up as a single
// paragraph, so those wrappers are replaced by their contents.
function unwrapBlockDescendants(el: Element) {
  const doc = el.ownerDocument;
  for (const block of Array.from(
    el.querySelectorAll(BLOCK_TAGS_SELECTOR),
  ).reverse()) {
    const replacements: Node[] = Array.from(block.childNodes);
    if (block.nextSibling) replacements.push(doc.createTextNode(" "));
    block.replaceWith(...replacements);
  }
}

// Word Online splits a single list across sibling <ul>s (one per wrapper div)
// and records depth in aria-level, so a list's nesting has to be recovered
// after flattening, from the level attributes rather than the element tree.
export function mergeAndNestFlattenedLists(
  blocks: HTMLElement[],
): HTMLElement[] {
  const merged: HTMLElement[] = [];
  for (const el of blocks) {
    const previous = merged[merged.length - 1];
    const isList = el.tagName === "UL" || el.tagName === "OL";
    if (isList && previous && previous.tagName === el.tagName) {
      while (el.firstChild) previous.appendChild(el.firstChild);
      continue;
    }
    merged.push(el);
  }
  for (const el of merged) {
    if (el.tagName === "UL" || el.tagName === "OL") nestListByAriaLevel(el);
  }
  return merged;
}

function nestListByAriaLevel(list: HTMLElement) {
  const doc = list.ownerDocument;
  const items = Array.from(list.children).filter((c) => c.tagName === "LI");
  const levels = items.map((li) =>
    parseInt(
      li.getAttribute("aria-level") ||
        li.getAttribute("data-aria-level") ||
        "1",
      10,
    ),
  );
  if (levels.length < 2 || levels.every((l) => l === levels[0])) return;

  const stack = [{ level: levels[0], list }];
  let lastItem: Element | null = null;
  items.forEach((item, index) => {
    const level = levels[index];
    while (stack.length > 1 && level < stack[stack.length - 1].level)
      stack.pop();
    if (level > stack[stack.length - 1].level) {
      const sublist = doc.createElement(list.tagName.toLowerCase());
      (lastItem || stack[stack.length - 1].list).appendChild(sublist);
      stack.push({ level, list: sublist as HTMLElement });
    }
    stack[stack.length - 1].list.appendChild(item);
    lastItem = item;
  });
}
