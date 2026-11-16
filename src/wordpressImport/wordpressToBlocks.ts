import { JSDOM } from "jsdom";
import {
  contentBuilder,
  escapeHtml,
  hoist,
  numberFact,
  stringFact,
  type ConvertedContent,
} from "src/import/content";
import type { WordpressAttachment } from "./parseWordpressExport";

const LEAFLET_WIDTH = 592;

// Everything in a WordPress body other than prose: block-editor figures, the
// classic editor's [caption]/[gallery] output, and raw media. A `wp-html`
// element stands in for a custom HTML block (see wrapHtmlBlocks).
const IMAGE = "figure.wp-block-image, .wp-caption, img";
const GALLERY = "figure.wp-block-gallery, .gallery, .tiled-gallery";
const COMPONENT = [
  IMAGE,
  GALLERY,
  "figure.wp-block-embed",
  "figure.wp-block-video",
  "figure.wp-block-audio",
  "video",
  "audio",
  "iframe",
  ".wp-block-buttons",
  "figure.wp-block-table",
  "table",
  "wp-html",
].join(",");

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const COMMENT_NODE = 8;

const positive = (v: unknown): number | null => {
  const n = Number(v);
  return n > 0 ? n : null;
};

// The player URL for a link WordPress would have turned into an embed, for
// the providers whose players can be addressed without an oEmbed lookup.
export function embedPlayer(
  url: string,
): { src: string; aspectRatio?: string; height: number } | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m)\./, "");
  if (/^(youtube\.com|youtu\.be|youtube-nocookie\.com)$/.test(host)) {
    const id =
      host === "youtu.be"
        ? u.pathname.split("/")[1]
        : u.searchParams.get("v") ??
          /^\/(?:embed|shorts|live)\/([^/]+)/.exec(u.pathname)?.[1];
    if (!id) return null;
    const start = seconds(
      u.searchParams.get("t") ?? u.searchParams.get("start"),
    );
    return {
      src: `https://www.youtube.com/embed/${id}${start ? `?start=${start}` : ""}`,
      aspectRatio: "16/9",
      height: 315,
    };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = /\/(\d+)/.exec(u.pathname)?.[1];
    if (!id) return null;
    return {
      src: `https://player.vimeo.com/video/${id}`,
      aspectRatio: "16/9",
      height: 315,
    };
  }
  if (host === "open.spotify.com") {
    const m =
      /^\/(?:embed\/)?(track|album|playlist|episode|show|artist)\/(\w+)/.exec(
        u.pathname,
      );
    if (!m) return null;
    return {
      src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`,
      height: m[1] === "track" || m[1] === "episode" ? 152 : 352,
    };
  }
  return null;
}

// YouTube's t= is either plain seconds ("1179", "1179s") or "1h2m3s".
function seconds(t: string | null): number | null {
  if (!t) return null;
  if (/^\d+s?$/.test(t)) return positive(parseInt(t));
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
  if (!m) return null;
  return positive(
    Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0),
  );
}

const embedFigure = (url: string) =>
  `<figure class="wp-block-embed"><div class="wp-block-embed__wrapper">${escapeHtml(url)}</div></figure>`;

const shortcodeAttr = (attrs: string, name: string) =>
  new RegExp(`\\b${name}=(["'])(.*?)\\1`).exec(attrs)?.[2] ?? null;

// The classic editor's shortcodes for media, as the HTML WordPress would
// render them. Other shortcodes (usually a plugin's) are left as written.
function expandShortcodes(
  html: string,
  attachments: Record<string, WordpressAttachment>,
): string {
  return html
    .replace(
      /\[caption([^\]]*)\]([\s\S]*?)\[\/caption\]/g,
      (_, attrs: string, inner: string) => {
        // The caption is whatever follows the image (and its link), unless
        // it's given as an attribute.
        const m =
          /^\s*((?:<a\b[^>]*>\s*)?<img\b[^>]*>(?:\s*<\/a>)?)([\s\S]*)$/.exec(
            inner,
          );
        if (!m) return inner;
        const caption = (shortcodeAttr(attrs, "caption") ?? m[2]).trim();
        const align = shortcodeAttr(attrs, "align") ?? "";
        return `<figure class="wp-caption ${escapeHtml(align)}">${m[1]}${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
      },
    )
    .replace(/\[embed[^\]]*\]([\s\S]*?)\[\/embed\]/g, (_, url: string) =>
      embedFigure(url.trim()),
    )
    .replace(/\[gallery([^\]]*)\]/g, (_, attrs: string) => {
      const ids = (shortcodeAttr(attrs, "ids") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      // Without ids a gallery shows every image attached to the post, which
      // the export doesn't reliably record.
      if (ids.length === 0) throw new Error("[gallery] shortcode without ids");
      const images = ids.map((id) => {
        const a = attachments[id];
        if (!a) throw new Error(`Gallery image ${id} isn't in the export`);
        return `<img src="${escapeHtml(a.url)}" class="wp-image-${id}">`;
      });
      return `<figure class="wp-block-gallery">${images.join("")}</figure>`;
    })
    .replace(
      /\[(audio|video)([^\]]*)\](?:\s*\[\/\1\])?/g,
      (_, kind: string, attrs: string) => {
        const src = ["src", "mp3", "m4a", "ogg", "wav", "mp4", "m4v", "webm"]
          .map((a) => shortcodeAttr(attrs, a))
          .find(Boolean);
        if (!src) throw new Error(`[${kind}] shortcode without a source`);
        return `<figure class="wp-block-${kind}"><${kind} controls src="${escapeHtml(src)}"></${kind}></figure>`;
      },
    );
}

const BLOCK_START =
  /^<(p|div|h[1-6]|ul|ol|dl|blockquote|pre|table|figure|hr|iframe|img|video|audio|address|section|!--)\b/i;

// The classic editor stores prose with blank lines between paragraphs and
// adds the <p>s when rendering (wpautop). A URL on a line of its own is an
// embed.
function autop(html: string): string {
  const pres: string[] = [];
  const protectedHtml = html
    .replace(/\r\n?/g, "\n")
    .replace(/<pre\b[\s\S]*?<\/pre>/gi, (pre) => {
      pres.push(pre);
      return `<pre data-wp-autop="${pres.length - 1}"></pre>`;
    });
  return protectedHtml
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      if (/^https?:\/\/\S+$/.test(chunk)) return embedFigure(chunk);
      if (BLOCK_START.test(chunk)) return chunk;
      return `<p>${chunk.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n")
    .replace(/<pre data-wp-autop="(\d+)"><\/pre>/g, (_, i) => pres[Number(i)]);
}

// A custom HTML block is raw markup between <!-- wp:html --> comments; keep
// it together so it can become one html block rather than being parsed as
// prose.
function wrapHtmlBlocks(doc: Document) {
  const walker = doc.createTreeWalker(doc.body, 128 /* SHOW_COMMENT */);
  const opens: Comment[] = [];
  while (walker.nextNode()) {
    const c = walker.currentNode as Comment;
    if (/^\s*wp:html\b/.test(c.data)) opens.push(c);
  }
  for (const open of opens) {
    const wrapper = doc.createElement("wp-html");
    open.parentNode!.insertBefore(wrapper, open);
    let node = open.nextSibling;
    while (
      node &&
      !(
        node.nodeType === COMMENT_NODE &&
        /^\s*\/wp:html\b/.test(node.textContent ?? "")
      )
    ) {
      const next = node.nextSibling;
      wrapper.appendChild(node);
      node = next;
    }
  }
}

function removeComments(doc: Document) {
  const walker = doc.createTreeWalker(doc.body, 128 /* SHOW_COMMENT */);
  const comments: Node[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  for (const c of comments) c.parentNode?.removeChild(c);
}

function prepare(doc: Document, rewriteLink?: (href: string) => string) {
  wrapHtmlBlocks(doc);
  removeComments(doc);
  for (const el of Array.from(doc.querySelectorAll("script, style, noscript")))
    if (!el.closest("wp-html")) el.remove();

  // A footnote is a <sup data-fn> reference plus an item in the footnotes
  // block at the end of the post. Hand the paste pipeline a span carrying
  // the content, the shape it mints footnote entities from.
  const definitions = new Map<string, Element>();
  for (const list of Array.from(doc.querySelectorAll(".wp-block-footnotes"))) {
    for (const li of Array.from(list.querySelectorAll("li[id]"))) {
      for (const back of Array.from(li.querySelectorAll('a[href$="-link"]')))
        back.remove();
      definitions.set(li.id, li);
    }
    list.remove();
  }
  for (const ref of Array.from(doc.querySelectorAll("sup[data-fn]"))) {
    const id = ref.getAttribute("data-fn")!;
    const definition = definitions.get(id);
    if (!definition) throw new Error(`Footnote ${id} has no content`);
    const span = doc.createElement("span");
    span.setAttribute("data-footnote-def", definition.innerHTML.trim());
    span.textContent = ref.textContent;
    ref.replaceWith(span);
  }

  for (const el of Array.from(
    doc.querySelectorAll(
      ".has-text-align-center, .has-text-align-right, [style*='text-align']",
    ),
  )) {
    const align =
      /has-text-align-(center|right)/.exec(el.className)?.[1] ??
      /text-align:\s*(center|right)/.exec(el.getAttribute("style") ?? "")?.[1];
    if (align) el.setAttribute("data-alignment", align);
  }

  if (rewriteLink)
    for (const a of Array.from(doc.querySelectorAll("a[href]")))
      a.setAttribute("href", rewriteLink(a.getAttribute("href")!));

  for (const el of Array.from(doc.querySelectorAll(COMPONENT))) {
    // Only the outermost element of a component is moved; e.g. the <img>
    // inside an image figure stays where it is.
    if (el.parentElement?.closest(COMPONENT)) continue;
    hoist(el, doc.body);
  }

  // The block editor leaves empty paragraphs behind as spacing.
  for (const p of Array.from(doc.querySelectorAll("p")))
    if (!p.textContent?.trim() && !p.querySelector(COMPONENT)) p.remove();
}

const caption = (html: string | null | undefined) =>
  html?.trim() ? `<p data-text-size="small">${html.trim()}</p>` : "";

export function wordpressHtmlToBlocks(
  html: string,
  opts: {
    parent: string;
    attachments: Record<string, WordpressAttachment>;
    rewriteLink?: (href: string) => string;
  },
): ConvertedContent {
  let source = expandShortcodes(html, opts.attachments);
  if (!/<!--\s*wp:/.test(source)) source = autop(source);
  const doc = new JSDOM(`<body>${source}</body>`).window.document;
  prepare(doc, opts.rewriteLink);
  const builder = contentBuilder(opts.parent);

  // The stored original for an <img>, when it names its attachment; the
  // body itself usually shows a resized rendition.
  const original = (img: Element) => {
    const id = /\bwp-image-(\d+)\b/.exec(img.className)?.[1];
    return id ? opts.attachments[id] : undefined;
  };
  const imageFile = (img: Element) => {
    const attachment = original(img);
    const src = img.getAttribute("src");
    if (attachment) return attachment;
    if (!src) throw new Error("Image without a src");
    return {
      url: src,
      width: positive(img.getAttribute("width")),
      height: positive(img.getAttribute("height")),
    };
  };

  const image = (el: Element) => {
    const img = el.tagName === "IMG" ? el : el.querySelector("img");
    if (!img) throw new Error("Image block without an <img>");
    const file = imageFile(img);
    const alt = img.getAttribute("alt")?.trim();
    // An image shown narrower than Leaflet's column keeps that width: a
    // resized block-editor image says so in its style, a classic one in its
    // width attribute.
    const shown =
      positive(
        /(?:^|;)\s*width:\s*(\d+)px/.exec(img.getAttribute("style") ?? "")?.[1],
      ) ?? positive(img.getAttribute("width"));
    const maxWidth = shown && shown < LEAFLET_WIDTH ? shown : null;
    const align = /\balign(left|center|right)\b/.exec(
      `${el.className} ${img.className}`,
    )?.[1];
    const entityID = builder.card({
      type: "image",
      facts: [
        ...(alt ? [stringFact("image/alt", alt)] : []),
        ...(maxWidth ? [numberFact("image/max-width", maxWidth)] : []),
        ...(maxWidth && align
          ? [
              {
                attribute: "block/text-alignment",
                data: { type: "text-alignment-type-union", value: align },
              },
            ]
          : []),
      ],
    });
    builder.image({ entityID, ...file });
    builder.html(
      caption(el.querySelector("figcaption, .wp-caption-text")?.innerHTML),
    );
  };

  const gallery = (el: Element) => {
    const imgs = Array.from(el.querySelectorAll("img"));
    if (imgs.length === 0) throw new Error("Gallery without images");
    builder.gallery(
      "grid",
      imgs.map((img) => ({
        ...imageFile(img),
        alt: img.getAttribute("alt")?.trim() || null,
      })),
    );
    builder.html(
      caption(
        el.querySelector(
          ":scope > figcaption, :scope > .blocks-gallery-caption",
        )?.innerHTML,
      ),
    );
  };

  const iframeEmbed = (iframe: Element) => {
    const src = iframe.getAttribute("src");
    if (!src) throw new Error("iframe without a src");
    const height = positive(iframe.getAttribute("height"));
    builder.card({
      type: "embed",
      facts: [
        stringFact("embed/url", src),
        ...(height ? [numberFact("embed/height", height)] : []),
      ],
    });
  };

  const embed = (el: Element) => {
    const url =
      el.querySelector(".wp-block-embed__wrapper")?.textContent?.trim() ?? "";
    const player = embedPlayer(url);
    const iframe = el.querySelector("iframe");
    if (player)
      builder.card({
        type: "embed",
        facts: [
          stringFact("embed/url", player.src),
          numberFact("embed/height", player.height),
          ...(player.aspectRatio
            ? [stringFact("embed/aspect-ratio", player.aspectRatio)]
            : []),
        ],
      });
    else if (iframe) iframeEmbed(iframe);
    else if (/^https?:\/\//.test(url))
      builder.card({ type: "link", facts: [stringFact("link/url", url)] });
    else throw new Error("Embed without a URL");
    builder.html(caption(el.querySelector("figcaption")?.innerHTML));
  };

  // Leaflet has no audio or video block; the file plays from where
  // WordPress stored it, in an html block.
  const media = (el: Element) => {
    const player =
      el.tagName === "VIDEO" || el.tagName === "AUDIO"
        ? el
        : el.querySelector("video, audio");
    const src =
      player?.getAttribute("src") ??
      player?.querySelector("source[src]")?.getAttribute("src");
    if (!player || !src) throw new Error("Media block without a source");
    const kind = player.tagName.toLowerCase();
    builder.card({
      type: "html",
      facts: [
        stringFact(
          "embed/html",
          `<style>html,body{margin:0;height:100%}${kind}{display:block;width:100%;${kind === "video" ? "height:100%;background:#000" : ""}}</style><${kind} controls preload="metadata" src="${escapeHtml(src)}"></${kind}>`,
        ),
        ...(kind === "video"
          ? [
              stringFact("embed/aspect-ratio", "16/9"),
              numberFact("embed/height", 315),
            ]
          : [numberFact("embed/height", 54)]),
      ],
    });
    builder.html(caption(el.querySelector("figcaption")?.innerHTML));
  };

  const buttons = (el: Element) => {
    for (const a of Array.from(el.querySelectorAll("a[href]"))) {
      const url = a.getAttribute("href")!;
      builder.card({
        type: "button",
        facts: [
          stringFact("button/text", a.textContent?.trim() || url),
          stringFact("button/url", url),
        ],
      });
    }
  };

  const rawHtml = (el: Element) => {
    const significant = Array.from(el.childNodes).filter(
      (n) => n.nodeType !== TEXT_NODE || n.textContent?.trim(),
    );
    const only = significant.length === 1 ? significant[0] : null;
    if ((only as Element | null)?.tagName === "IFRAME")
      return iframeEmbed(only as Element);
    const markup = el.tagName === "WP-HTML" ? el.innerHTML : el.outerHTML;
    if (markup.trim())
      builder.card({
        type: "html",
        facts: [stringFact("embed/html", markup.trim())],
      });
  };

  const component = (el: Element) => {
    if (el.matches(GALLERY)) return gallery(el);
    if (el.matches("figure.wp-block-embed")) return embed(el);
    if (
      el.matches("figure.wp-block-video, figure.wp-block-audio, video, audio")
    )
      return media(el);
    if (el.matches(IMAGE)) return image(el);
    if (el.matches("iframe")) return iframeEmbed(el);
    if (el.matches(".wp-block-buttons")) return buttons(el);
    if (el.matches("figure.wp-block-table")) {
      rawHtml(el.querySelector("table") ?? el);
      return builder.html(caption(el.querySelector("figcaption")?.innerHTML));
    }
    return rawHtml(el);
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

// The first paragraph of a post's text, for a description when the post has
// no excerpt. Leaflet shows the description as a subtitle and meta
// description, so keep it to a sentence or two.
export function wordpressExcerpt(
  post: { excerpt: string; html: string },
  maxLength = 280,
): string {
  const source = post.excerpt || post.html;
  let html = source.replace(/\[[a-z_-]+[^\]]*\][\s\S]*?\[\/[a-z_-]+\]/g, "");
  if (!/<!--\s*wp:/.test(html)) html = autop(html);
  const doc = new JSDOM(`<body>${html}</body>`).window.document;
  const first =
    Array.from(doc.querySelectorAll("p"))
      .map((p) => p.textContent?.replace(/\s+/g, " ").trim() ?? "")
      .find(Boolean) ?? "";
  if (first.length <= maxLength) return first;
  return first.slice(0, maxLength).replace(/\s+\S*$/, "") + "…";
}
