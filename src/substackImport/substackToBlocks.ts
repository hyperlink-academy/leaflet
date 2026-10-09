import { JSDOM } from "jsdom";
import {
  contentBuilder,
  escapeHtml,
  numberFact,
  stringFact,
  type ConvertedContent,
} from "src/import/content";

// Substack serves every image through a resizing CDN whose URLs wrap the
// stored file's URL, percent-encoded, after one segment of transformations.
const CDN = "https://substackcdn.com/image/fetch/";
const CDN_URL =
  /^https:\/\/substackcdn\.com\/image\/fetch\/[^/]*\/(https?%3A.+)$/i;

export function substackOriginalUrl(url: string): string {
  const wrapped = CDN_URL.exec(url);
  return wrapped ? decodeURIComponent(wrapped[1]) : url;
}

const isHeic = (original: string) =>
  /\.hei[cf]$/i.test(new URL(original).pathname);

// The CDN's full-size rendition of an image. It re-encodes whatever it
// serves, so this is a stand-in for the original, not a copy of it.
export function substackFullSizeUrl(url: string): string {
  const original = substackOriginalUrl(url);
  return `${CDN}${isHeic(original) ? "f_jpg," : ""}q_auto:best/${encodeURIComponent(original)}`;
}

// Where an import copies an image from: the file as the author uploaded it.
// HEIC uploads are the exception — browsers can't show them (Substack itself
// only ever serves them transcoded), so they're taken from the CDN as JPEG.
export function substackImageSource(url: string): string {
  const original = substackOriginalUrl(url);
  return isHeic(original) ? substackFullSizeUrl(original) : original;
}

// Originals run to tens of megabytes; a preview shows the size Substack's
// own pages do.
export function substackPreviewUrl(url: string): string {
  return `${CDN}w_1456,c_limit,f_auto,q_auto:good/${encodeURIComponent(substackOriginalUrl(url))}`;
}

// Substack's content column is 728px wide and Leaflet's 592px, so an image
// the author sized down keeps the same share of the column.
const SUBSTACK_WIDTH = 728;
const LEAFLET_WIDTH = 592;

// Everything Substack's editor inserts other than prose. Each carries its
// settings as JSON in data-attrs.
const COMPONENT = [
  ".captioned-image-container",
  "a.image-link",
  "img",
  "iframe",
  "[data-component-name]",
  "[data-attrs]",
].join(",");

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

function attrs(el: Element): Record<string, unknown> {
  const raw = el.getAttribute("data-attrs");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Unreadable data-attrs on <${el.tagName.toLowerCase()}>`);
  }
}
const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v : null;
const positive = (v: unknown): number | null => {
  const n = Number(v);
  return n > 0 ? n : null;
};

// Lift an element out of whatever contains it so it stands directly in the
// body, splitting each ancestor in two around it. An image inside a list item
// becomes: the list up to that point, the image, the rest of the list.
function hoist(el: Element, body: Element) {
  while (el.parentElement && el.parentElement !== body) {
    const parent = el.parentElement;
    const after = parent.cloneNode(false) as Element;
    after.removeAttribute("id");
    while (el.nextSibling) after.appendChild(el.nextSibling);
    const container = parent.parentNode!;
    container.insertBefore(el, parent.nextSibling);
    if (after.childNodes.length) container.insertBefore(after, el.nextSibling);
    if (!parent.childNodes.length) parent.remove();
  }
}

function prepare(
  doc: Document,
  rewriteLink: ((href: string) => string) | undefined,
) {
  // A footnote is an anchor in the text plus a block holding its content,
  // usually at the end of the post. Hand the paste pipeline a span carrying
  // the content, the shape it mints footnote entities from.
  const definitions = new Map<string, Element>();
  for (const note of Array.from(doc.querySelectorAll("div.footnote"))) {
    const id = note.querySelector("a.footnote-number")?.id;
    const content = note.querySelector(".footnote-content");
    if (id && content) definitions.set(id, content);
    note.remove();
  }
  for (const anchor of Array.from(doc.querySelectorAll("a.footnote-anchor"))) {
    const id = anchor.getAttribute("href")?.replace(/^#/, "") ?? "";
    const definition = definitions.get(id);
    if (!definition) throw new Error(`Footnote ${id} has no content`);
    const span = doc.createElement("span");
    span.setAttribute("data-footnote-def", definition.innerHTML);
    span.textContent = anchor.textContent;
    anchor.replaceWith(span);
  }

  // A mention is an empty span Substack fills in client-side.
  for (const mention of Array.from(doc.querySelectorAll("span.mention-wrap"))) {
    const name = str(attrs(mention).name);
    if (!name) throw new Error("Mention without a name");
    mention.replaceWith(doc.createTextNode(name));
  }

  for (const el of Array.from(doc.querySelectorAll("[style]"))) {
    const align = /text-align:\s*(left|center|right)/.exec(
      el.getAttribute("style") ?? "",
    )?.[1];
    if (align && align !== "left") el.setAttribute("data-alignment", align);
  }

  if (rewriteLink)
    for (const a of Array.from(doc.querySelectorAll("a[href]")))
      a.setAttribute("href", rewriteLink(a.getAttribute("href")!));

  for (const el of Array.from(doc.querySelectorAll(COMPONENT))) {
    // Only the outermost element of a component is moved; e.g. the <img>
    // inside an image link stays where it is.
    if (el.parentElement?.closest(COMPONENT)) continue;
    hoist(el, doc.body);
  }

  // The editor leaves empty paragraphs behind as spacing.
  for (const p of Array.from(doc.querySelectorAll("p")))
    if (!p.textContent?.trim() && !p.querySelector(COMPONENT)) p.remove();
}

const caption = (html: string | null | undefined) =>
  html?.trim() ? `<p data-text-size="small">${html.trim()}</p>` : "";

export function substackHtmlToBlocks(
  html: string,
  opts: { parent: string; rewriteLink?: (href: string) => string },
): ConvertedContent {
  const doc = new JSDOM(`<body>${html}</body>`).window.document;
  prepare(doc, opts.rewriteLink);
  const builder = contentBuilder(opts.parent);

  const image = (el: Element) => {
    const img = el.tagName === "IMG" ? el : el.querySelector("img");
    if (!img) throw new Error("Image block without an <img>");
    const a = attrs(img);
    const src = str(a.src) ?? img.getAttribute("src");
    if (!src) throw new Error("Image without a src");
    const alt = str(a.alt) ?? str(img.getAttribute("alt"));
    const resized = positive(a.resizeWidth);
    const maxWidth =
      resized && resized < SUBSTACK_WIDTH
        ? Math.round((resized / SUBSTACK_WIDTH) * LEAFLET_WIDTH)
        : null;
    const align = str(a.align);
    const entityID = builder.card({
      type: "image",
      facts: [
        ...(alt ? [stringFact("image/alt", alt)] : []),
        ...(maxWidth ? [numberFact("image/max-width", maxWidth)] : []),
        ...(maxWidth && align && ["left", "center", "right"].includes(align)
          ? [
              {
                attribute: "block/text-alignment",
                data: { type: "text-alignment-type-union", value: align },
              },
            ]
          : []),
      ],
    });
    builder.image({
      entityID,
      url: substackImageSource(src),
      width: positive(a.width) ?? positive(img.getAttribute("width")),
      height: positive(a.height) ?? positive(img.getAttribute("height")),
    });
    builder.html(caption(el.querySelector("figcaption")?.innerHTML));
  };

  const gallery = (el: Element) => {
    const g = attrs(el).gallery as
      | { images?: Array<{ src?: string }>; caption?: string; alt?: string }
      | undefined;
    const images = g?.images ?? [];
    if (images.length === 0) throw new Error("Image gallery without images");
    builder.gallery(
      "grid",
      images.map((i) => {
        if (!i.src) throw new Error("Gallery image without a src");
        // Gallery images state no size, but most stored file names end in
        // one: …_1024x768.jpeg.
        const size = /_(\d+)x(\d+)\.\w+$/.exec(substackOriginalUrl(i.src));
        return {
          url: substackImageSource(i.src),
          width: positive(size?.[1]),
          height: positive(size?.[2]),
          alt: str(g?.alt),
        };
      }),
    );
    builder.html(caption(g?.caption && escapeHtml(g.caption)));
  };

  const button = (el: Element) => {
    const a = attrs(el);
    const url = str(a.url) ?? el.querySelector("a[href]")?.getAttribute("href");
    if (!url) throw new Error("Button without a url");
    const { pathname, searchParams } = new URL(url);
    if (/^\/subscribe\/?$/.test(pathname))
      return builder.card({ type: "signup", facts: [] });
    // Share and comment buttons act on the Substack post itself; there is
    // nothing for them to do on the imported one.
    if (
      searchParams.get("action") === "share" ||
      /\/comments\/?$/.test(pathname)
    )
      return;
    builder.card({
      type: "button",
      facts: [
        stringFact("button/text", str(a.text) ?? el.textContent?.trim() ?? url),
        stringFact("button/url", url),
      ],
    });
  };

  const link = (
    url: string,
    title: string | null,
    description: string | null,
  ) =>
    builder.card({
      type: "link",
      facts: [
        stringFact("link/url", url),
        ...(title ? [stringFact("link/title", title)] : []),
        ...(description ? [stringFact("link/description", description)] : []),
      ],
    });

  const component = (el: Element) => {
    const a = attrs(el);
    if (el.matches(".captioned-image-container, a.image-link, img"))
      return image(el);
    if (el.matches(".image-gallery-embed")) return gallery(el);
    if (
      el.matches(".subscription-widget-wrap, .subscription-widget-wrap-editor")
    )
      return builder.card({ type: "signup", facts: [] });
    if (el.matches(".button-wrapper")) return button(el);
    if (el.matches(".twitter-embed") && str(a.url))
      return link(
        str(a.url)!,
        str(a.name) && `${a.name} (@${a.username})`,
        str(a.full_text),
      );
    if (el.matches(".embedded-post-wrap") && str(a.url))
      return link(
        str(a.url)!,
        str(a.title),
        str(a.publication_name) ?? str(a.truncated_body_text),
      );
    const iframe = el.tagName === "IFRAME" ? el : el.querySelector("iframe");
    const src = iframe?.getAttribute("src");
    if (src) {
      const height = positive(iframe!.getAttribute("height"));
      return builder.card({
        type: "embed",
        facts: [
          stringFact("embed/url", src),
          ...(height ? [numberFact("embed/height", height)] : []),
        ],
      });
    }
    // Uploaded video and audio, polls, and the like have no file in the
    // export and no Leaflet block; refuse rather than drop them silently.
    throw new Error(
      `Unsupported Substack component "${el.getAttribute("data-component-name") ?? el.className}"`,
    );
  };

  for (const node of Array.from(doc.body.childNodes)) {
    if (node.nodeType === TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text.trim()) builder.html(`<p>${escapeHtml(text)}</p>`);
    } else if (node.nodeType === ELEMENT_NODE) {
      const el = node as Element;
      if (el.matches(COMPONENT)) component(el);
      else builder.html(el.outerHTML);
    }
  }
  return builder.finish();
}
