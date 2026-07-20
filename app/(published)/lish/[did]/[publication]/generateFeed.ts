import { AtUri } from "@atproto/syntax";
import { Feed } from "feed";
import { PubLeafletPagesLinearDocument } from "lexicons/api";
import { createElement } from "react";
import { StaticPostContent } from "./[rkey]/StaticPostContent";
import { supabaseServerClient } from "supabase/serverClient";
import { NextResponse } from "next/server";
import {
  normalizePublicationRecord,
  normalizeDocumentRecord,
  hasLeafletContent,
  isLeafletPublication,
} from "src/utils/normalizeRecords";
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import {
  getDocumentURL,
  getPublicationURL,
} from "app/(published)/lish/createPub/getPublicationURL";

// Readers poll feeds constantly and every item is a full React SSR render
// (including shiki highlighting for code blocks), so cap the feed at the
// most recent posts instead of rendering a publication's entire history
// on each request.
const FEED_ITEM_LIMIT = 50;

// The feed library pretty-prints, leaving `<link>url</link>` followed by a
// newline and indentation. `<link>` is a void element in HTML, so consumers
// that parse RSS with an HTML parser drop the closing tag and read the URL
// merged with the trailing indentation — then request paths like
// "/{rkey}%0A%20%20...". Collapsing inter-tag whitespace (outside CDATA,
// which holds post content) leaves those parsers a clean URL.
export function collapseInterTagWhitespace(xml: string): string {
  return xml
    .split(/(<!\[CDATA\[[\s\S]*?\]\]>)/)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(/>\s+</g, "><")))
    .join("");
}

// XML 1.0 forbids most C0 control characters even inside CDATA, and records
// can carry them (lexicon string validation doesn't reject control chars).
// One bad character in a title would make the whole feed unparseable.
function stripInvalidXmlChars(s: string): string {
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

// Records can carry unparseable date strings (the publish action accepts the
// caller's publishedAt verbatim), and an Invalid Date makes feed.atom1() and
// feed.json1() throw for the whole publication.
function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

export async function generateFeed(
  did: string,
  publication_name: string,
): Promise<Feed | NextResponse<unknown>> {
  let renderToReadableStream = await import("react-dom/server").then(
    (module) => module.renderToReadableStream,
  );
  let { data: publications, error } = await supabaseServerClient
    .from("publications")
    .select(
      `*,
      documents_in_publications(documents(*))
      `,
    )
    .eq("identity_did", did)
    .or(publicationNameOrUriFilter(did, publication_name))
    .order("uri", { ascending: false })
    .limit(1);
  if (error) {
    // A transient query failure should surface as retryable to feed readers —
    // many of them permanently drop subscriptions after repeated 404s.
    console.error(error);
    return new NextResponse(null, { status: 500 });
  }
  let publication = publications?.[0];
  if (!publication) return new NextResponse(null, { status: 404 });

  const pubRecord = normalizePublicationRecord(publication.record);
  // Legacy pub.leaflet publications without a configured domain don't
  // normalize (no URL), but they're still browsable at leaflet.pub/lish/…,
  // so serve their feed from there rather than 404ing.
  const rawRecord = isLeafletPublication(publication.record)
    ? publication.record
    : null;
  const name = pubRecord?.name ?? rawRecord?.name;
  if (!name) return new NextResponse(null, { status: 404 });
  const absolutize = (url: string) =>
    url.startsWith("/") ? `https://leaflet.pub${url}` : url;
  const pubInput = { uri: publication.uri, record: publication.record };
  const pubUrl = absolutize(pubRecord?.url ?? getPublicationURL(pubInput)).replace(
    /\/$/,
    "",
  );
  const description = pubRecord?.description ?? rawRecord?.description;

  let docs = publication.documents_in_publications
    .sort((a, b) => {
      const dateA = a.documents?.sort_date
        ? new Date(a.documents.sort_date).getTime()
        : 0;
      const dateB = b.documents?.sort_date
        ? new Date(b.documents.sort_date).getTime()
        : 0;
      return dateB - dateA; // Sort in descending order (newest first)
    })
    .slice(0, FEED_ITEM_LIMIT);

  const newest = parseDate(docs[0]?.documents?.sort_date);

  const feed = new Feed({
    title: stripInvalidXmlChars(name),
    // feed@5.1.0 renders an undefined description as the literal string
    // "undefined" in RSS, and RSS 2.0 requires the element regardless.
    description: stripInvalidXmlChars(description || name),
    id: pubUrl,
    link: pubUrl,
    language: "en", // optional, used only in RSS 2.0, possible values: http://www.w3.org/TR/REC-html40/struct/dirlang.html#langcodes
    copyright: "",
    // Without `updated` the library stamps render time into lastBuildDate /
    // <updated>, so the feed byte-changes on every request even with no new
    // posts, defeating readers' change detection.
    updated: newest ?? new Date(0),
    // Atom requires a feed-level author when entries carry none.
    author: { name, link: pubUrl },
    feedLinks: {
      rss: `${pubUrl}/rss`,
      atom: `${pubUrl}/atom`,
      json: `${pubUrl}/json`,
    },
  });

  for (const doc of docs) {
    if (!doc.documents) continue;
    const record = normalizeDocumentRecord(
      doc.documents?.data,
      doc.documents?.uri,
    );
    const uri = new AtUri(doc.documents?.uri);
    if (!record) continue;

    let blocks: PubLeafletPagesLinearDocument.Block[] = [];
    if (hasLeafletContent(record) && record.content.pages[0]) {
      const firstPage = record.content.pages[0];
      if (PubLeafletPagesLinearDocument.isMain(firstPage)) {
        blocks = firstPage.blocks || [];
      }
    }

    const docUrl = absolutize(
      getDocumentURL(record, doc.documents.uri, pubRecord ?? pubInput),
    );

    let content: string;
    if (blocks.length === 0) {
      // Canvas pages and externally-authored documents have no linear blocks
      // to render; link out instead of shipping an empty body.
      content = `<p><a href="${docUrl}">View this post on the web</a></p>`;
    } else {
      const stream = await renderToReadableStream(
        createElement(StaticPostContent, {
          blocks,
          did: uri.host,
          baseUrl: pubUrl,
        }),
      );
      content = await new Response(stream).text();
      // Strip <link> preload tags injected by React SSR — they trigger
      // security warnings in RSS validators and aren't useful in feeds.
      content = content.replace(/<link\b[^>]*>/gi, "");
      // Convert relative URLs to absolute so RSS readers can resolve them.
      content = content.replace(/(src|href)="\/(?!\/)/g, `$1="${pubUrl}/`);
    }

    const date =
      parseDate(record.publishedAt) ??
      parseDate(doc.documents.sort_date) ??
      new Date(0);

    feed.addItem({
      title: stripInvalidXmlChars(record.title || ""),
      description: record.description
        ? stripInvalidXmlChars(record.description)
        : undefined,
      date,
      // `date` alone only maps to date_modified/<updated>; readers want the
      // publish date too (Atom <published>, JSON Feed date_published).
      published: date,
      id: docUrl,
      link: docUrl,
      content: stripInvalidXmlChars(content),
    });
  }

  return feed;
}
