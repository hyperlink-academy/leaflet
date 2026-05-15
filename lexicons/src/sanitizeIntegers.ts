/**
 * Sanitizes integer fields in records before they are written to a PDS.
 *
 * AT Protocol lexicon validation distinguishes integer from float values.
 * JavaScript only has a single Number type, so values read from a Supabase
 * JSON column (or any other source) may carry fractional parts even when the
 * lexicon expects an integer. The CBOR encoder will then serialize them as
 * floats, and downstream consumers that validate against the lexicon will
 * reject the record.
 *
 * The helpers below round known integer-typed fields and return a shallow-copy
 * of the input so the original DB-read object is not mutated.
 */

function toInt(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return Math.round(v);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Round r/g/b (and a when present) on a color object. */
function sanitizeColor(color: unknown): unknown {
  if (!isObject(color)) return color;
  const out: Record<string, unknown> = { ...color };
  if ("r" in out) out.r = toInt(out.r) ?? out.r;
  if ("g" in out) out.g = toInt(out.g) ?? out.g;
  if ("b" in out) out.b = toInt(out.b) ?? out.b;
  if ("a" in out) out.a = toInt(out.a) ?? out.a;
  return out;
}

/** Sanitize a pub.leaflet.publication#theme. */
export function sanitizeTheme(theme: unknown): unknown {
  if (!isObject(theme)) return theme;
  const out: Record<string, unknown> = { ...theme };
  if ("pageWidth" in out) {
    const v = toInt(out.pageWidth);
    if (v !== undefined) out.pageWidth = v;
  }
  for (const key of [
    "backgroundColor",
    "primary",
    "pageBackground",
    "accentBackground",
    "accentText",
  ]) {
    if (key in out) out[key] = sanitizeColor(out[key]);
  }
  if (isObject(out.backgroundImage)) {
    const bg: Record<string, unknown> = { ...out.backgroundImage };
    if ("width" in bg) {
      const v = toInt(bg.width);
      if (v !== undefined) bg.width = v;
    }
    out.backgroundImage = bg;
  }
  return out;
}

/** Sanitize a site.standard.theme.basic. */
export function sanitizeBasicTheme(basicTheme: unknown): unknown {
  if (!isObject(basicTheme)) return basicTheme;
  const out: Record<string, unknown> = { ...basicTheme };
  for (const key of ["background", "foreground", "accent", "accentForeground"]) {
    if (key in out) out[key] = sanitizeColor(out[key]);
  }
  return out;
}

/** Sanitize a richtext facet (pub.leaflet.richtext.facet#main). */
function sanitizeFacet(facet: unknown): unknown {
  if (!isObject(facet)) return facet;
  const out: Record<string, unknown> = { ...facet };
  if (isObject(out.index)) {
    const idx: Record<string, unknown> = { ...out.index };
    if ("byteStart" in idx) {
      const v = toInt(idx.byteStart);
      if (v !== undefined) idx.byteStart = v;
    }
    if ("byteEnd" in idx) {
      const v = toInt(idx.byteEnd);
      if (v !== undefined) idx.byteEnd = v;
    }
    out.index = idx;
  }
  if (Array.isArray(out.features)) {
    out.features = out.features.map((feature) => {
      if (!isObject(feature)) return feature;
      const f: Record<string, unknown> = { ...feature };
      // Footnote features can carry nested facets.
      if (Array.isArray(f.contentFacets)) {
        f.contentFacets = f.contentFacets.map(sanitizeFacet);
      }
      return f;
    });
  }
  return out;
}

function sanitizeFacetArray(facets: unknown): unknown {
  if (!Array.isArray(facets)) return facets;
  return facets.map(sanitizeFacet);
}

/** Sanitize an aspectRatio object with width/height. */
function sanitizeAspectRatio(ar: unknown): unknown {
  if (!isObject(ar)) return ar;
  const out: Record<string, unknown> = { ...ar };
  if ("width" in out) {
    const v = toInt(out.width);
    if (v !== undefined) out.width = v;
  }
  if ("height" in out) {
    const v = toInt(out.height);
    if (v !== undefined) out.height = v;
  }
  return out;
}

/**
 * Sanitize the inner content of a block (the value of `block.block`).
 * Handles header, image, iframe, orderedList, unorderedList (recursive), and
 * any block that carries facets.
 */
function sanitizeInnerBlock(inner: unknown): unknown {
  if (!isObject(inner)) return inner;
  const type = inner.$type;
  const out: Record<string, unknown> = { ...inner };

  if (type === "pub.leaflet.blocks.header") {
    if ("level" in out) {
      const v = toInt(out.level);
      if (v !== undefined) out.level = v;
    }
    if ("facets" in out) out.facets = sanitizeFacetArray(out.facets);
    return out;
  }

  if (type === "pub.leaflet.blocks.image") {
    if ("aspectRatio" in out) out.aspectRatio = sanitizeAspectRatio(out.aspectRatio);
    return out;
  }

  if (type === "pub.leaflet.blocks.iframe") {
    if ("height" in out) {
      const v = toInt(out.height);
      if (v !== undefined) out.height = v;
    }
    if ("aspectRatio" in out) out.aspectRatio = sanitizeAspectRatio(out.aspectRatio);
    return out;
  }

  if (type === "pub.leaflet.blocks.orderedList") {
    if ("startIndex" in out) {
      const v = toInt(out.startIndex);
      if (v !== undefined) out.startIndex = v;
    }
    if (Array.isArray(out.children)) {
      out.children = out.children.map(sanitizeListItem);
    }
    return out;
  }

  if (type === "pub.leaflet.blocks.unorderedList") {
    if (Array.isArray(out.children)) {
      out.children = out.children.map(sanitizeListItem);
    }
    return out;
  }

  // Text, blockquote and similar carry facets but no other integer fields.
  if ("facets" in out) out.facets = sanitizeFacetArray(out.facets);
  return out;
}

function sanitizeListItem(item: unknown): unknown {
  if (!isObject(item)) return item;
  const out: Record<string, unknown> = { ...item };
  if ("content" in out) out.content = sanitizeInnerBlock(out.content);
  if (Array.isArray(out.children)) {
    out.children = out.children.map(sanitizeListItem);
  }
  if (isObject(out.orderedListChildren)) {
    out.orderedListChildren = sanitizeInnerBlock(out.orderedListChildren);
  }
  if (isObject(out.unorderedListChildren)) {
    out.unorderedListChildren = sanitizeInnerBlock(out.unorderedListChildren);
  }
  return out;
}

/** Sanitize a single page (linearDocument or canvas). */
function sanitizePage(page: unknown): unknown {
  if (!isObject(page)) return page;
  const out: Record<string, unknown> = { ...page };

  if (out.$type === "pub.leaflet.pages.canvas" && Array.isArray(out.blocks)) {
    out.blocks = out.blocks.map((b) => {
      if (!isObject(b)) return b;
      const blockOut: Record<string, unknown> = { ...b };
      for (const key of ["x", "y", "width", "height", "rotation"]) {
        if (key in blockOut) {
          const v = toInt(blockOut[key]);
          if (v !== undefined) blockOut[key] = v;
        }
      }
      if ("block" in blockOut) blockOut.block = sanitizeInnerBlock(blockOut.block);
      return blockOut;
    });
    return out;
  }

  if (out.$type === "pub.leaflet.pages.linearDocument" && Array.isArray(out.blocks)) {
    out.blocks = out.blocks.map((b) => {
      if (!isObject(b)) return b;
      const blockOut: Record<string, unknown> = { ...b };
      if ("block" in blockOut) blockOut.block = sanitizeInnerBlock(blockOut.block);
      return blockOut;
    });
    return out;
  }

  return out;
}

/** Sanitize a `pub.leaflet.content` object (the `content` field of site.standard.document). */
function sanitizeContent(content: unknown): unknown {
  if (!isObject(content)) return content;
  const out: Record<string, unknown> = { ...content };
  if (Array.isArray(out.pages)) out.pages = out.pages.map(sanitizePage);
  return out;
}

/**
 * Sanitize a publication record (pub.leaflet.publication or
 * site.standard.publication). Returns a new object with integer fields rounded.
 */
export function sanitizePublicationRecord<T>(record: T): T {
  if (!isObject(record)) return record;
  const out: Record<string, unknown> = { ...record };
  if ("theme" in out) out.theme = sanitizeTheme(out.theme);
  if ("basicTheme" in out) out.basicTheme = sanitizeBasicTheme(out.basicTheme);
  return out as T;
}

/**
 * Sanitize a document record (pub.leaflet.document or site.standard.document).
 * Walks `pages` (legacy) / `content.pages` (standard) and the optional `theme`.
 */
export function sanitizeDocumentRecord<T>(record: T): T {
  if (!isObject(record)) return record;
  const out: Record<string, unknown> = { ...record };
  if ("theme" in out) out.theme = sanitizeTheme(out.theme);
  if ("content" in out) out.content = sanitizeContent(out.content);
  if (Array.isArray(out.pages)) out.pages = out.pages.map(sanitizePage);
  return out as T;
}

/**
 * Dispatch sanitizer based on the record's `$type` (or `collection` if the
 * record has no `$type`). Safe fallback that returns the record unchanged when
 * the type is not recognized.
 */
export function sanitizeRecordForCollection<T>(
  collection: string,
  record: T,
): T {
  if (
    collection === "pub.leaflet.publication" ||
    collection === "site.standard.publication"
  ) {
    return sanitizePublicationRecord(record);
  }
  if (
    collection === "pub.leaflet.document" ||
    collection === "site.standard.document"
  ) {
    return sanitizeDocumentRecord(record);
  }
  return record;
}
