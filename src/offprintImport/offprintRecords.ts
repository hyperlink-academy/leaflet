import { AtUri } from "@atproto/syntax";
import { AtpBaseClient } from "lexicons/api";
import { idResolver } from "src/identity/idResolver";

// Offprint publishes site.standard.document records whose body is its own
// content type. The types below follow the app.offprint.* lexicons, resolved
// through the `_lexicon.offprint.app` DNS record to the authority repo's
// com.atproto.lexicon.schema records; ./offprint-lexicons.json is a snapshot
// of the content-related ones.

export type OffprintFacetFeature =
  | { $type: "app.offprint.richtext.facet#bold" }
  | { $type: "app.offprint.richtext.facet#italic" }
  | { $type: "app.offprint.richtext.facet#underline" }
  | { $type: "app.offprint.richtext.facet#strikethrough" }
  | { $type: "app.offprint.richtext.facet#code" }
  | { $type: "app.offprint.richtext.facet#highlight"; color?: string }
  | { $type: "app.offprint.richtext.facet#link"; uri: string }
  | {
      $type: "app.offprint.richtext.facet#mention";
      did: string;
      handle?: string;
    }
  | {
      $type: "app.offprint.richtext.facet#webMention";
      uri: string;
      title: string;
      siteName?: string;
    }
  | { $type: string };

export type OffprintFacet = {
  index: { byteStart: number; byteEnd: number };
  features: OffprintFacetFeature[];
};

// Raw JSON carries `ref: {$link}`; the xrpc client decodes records into
// BlobRef instances whose `ref` is a CID object.
export type OffprintBlob = {
  $type?: "blob";
  ref: { $link: string } | { toString(): string };
  mimeType: string;
  size: number;
};

export function blobCid(blob: OffprintBlob | undefined): string | null {
  const ref = blob?.ref as { $link?: unknown } | string | undefined;
  if (!ref) return null;
  if (typeof ref === "string") return ref;
  if (typeof ref.$link === "string") return ref.$link;
  const s = String(ref);
  return s.startsWith("baf") ? s : null;
}

export type OffprintAspectRatio = { width: number; height: number };
type Alignment = "left" | "center" | "right";

export type OffprintTextBlock = {
  $type: "app.offprint.block.text";
  plaintext: string;
  facets?: OffprintFacet[];
  textAlign?: Alignment | "justify";
};
export type OffprintHeadingBlock = {
  $type: "app.offprint.block.heading";
  plaintext: string;
  level: number;
  facets?: OffprintFacet[];
  textAlign?: Alignment;
};
export type OffprintListItem = {
  content: OffprintTextBlock;
  children?: OffprintListItem[];
};
export type OffprintTaskItem = {
  content: OffprintTextBlock;
  checked: boolean;
  children?: OffprintTaskItem[];
};
export type OffprintGridImage = {
  // The lexicon names the blob `blob`; records in the wild use `image`.
  blob?: OffprintBlob;
  image?: OffprintBlob;
  alt?: string;
  aspectRatio?: OffprintAspectRatio;
};

export type OffprintBlock =
  | OffprintTextBlock
  | OffprintHeadingBlock
  | {
      $type: "app.offprint.block.blockquote";
      content: Array<OffprintTextBlock | OffprintHeadingBlock>;
    }
  | {
      $type: "app.offprint.block.callout";
      plaintext: string;
      facets?: OffprintFacet[];
      emoji?: string;
      color?: string;
    }
  | { $type: "app.offprint.block.bulletList"; children: OffprintListItem[] }
  | {
      $type: "app.offprint.block.orderedList";
      children: OffprintListItem[];
      start?: number;
    }
  | { $type: "app.offprint.block.taskList"; children: OffprintTaskItem[] }
  | {
      $type: "app.offprint.block.codeBlock";
      code: string;
      language?: string;
      showLineNumbers?: boolean;
    }
  | { $type: "app.offprint.block.horizontalRule" }
  | {
      $type: "app.offprint.block.image";
      image?: OffprintBlob;
      alt?: string;
      aspectRatio?: OffprintAspectRatio;
      alignment?: Alignment;
      // CSS width, e.g. "63%" or "300px".
      width?: string;
      caption?: string;
      captionFacets?: OffprintFacet[];
    }
  | {
      $type: "app.offprint.block.imageGrid";
      images: OffprintGridImage[];
      caption?: string;
      gridRows?: number;
      aspectRatio?: "landscape" | "portrait" | "square" | "mosaic";
    }
  | {
      $type: "app.offprint.block.imageCarousel";
      images: OffprintGridImage[];
      caption?: string;
    }
  | {
      $type: "app.offprint.block.imageDiff";
      images: OffprintGridImage[];
      caption?: string;
      width?: string;
      alignment?: Alignment;
    }
  | {
      $type: "app.offprint.block.webBookmark";
      href: string;
      title: string;
      description?: string;
      siteName?: string;
      preview?: OffprintBlob;
    }
  | {
      $type: "app.offprint.block.webEmbed";
      href: string;
      title?: string;
      description?: string;
      siteName?: string;
      preview?: OffprintBlob;
      embedUrl?: string;
      embedWidth?: number;
      embedHeight?: number;
      width?: string;
      alignment?: Alignment;
    }
  | {
      $type: "app.offprint.block.button";
      text: string;
      href: string;
      caption?: string;
      alignment?: Alignment;
    }
  | { $type: "app.offprint.block.mathBlock"; tex: string }
  | {
      $type: "app.offprint.block.blueskyPost";
      post: { uri: string; cid: string };
    }
  | { $type: "app.offprint.block.component"; component: string }
  | { $type: string };

export const OFFPRINT_CONTENT = "app.offprint.content";

export type OffprintContent = { $type: string; items?: OffprintBlock[] };

export type OffprintDocument = {
  $type: "site.standard.document";
  title: string;
  path?: string;
  site: string;
  publishedAt?: string;
  description?: string;
  tags?: string[];
  textContent?: string;
  coverImage?: OffprintBlob;
  content: OffprintContent;
};

export type OffprintComponent = {
  $type: "app.offprint.component";
  name: string;
  publication: string;
  content: OffprintContent;
};

// What the admin picks from: enough to identify a post and spot the ones the
// converter will refuse.
export type OffprintPost = {
  uri: string;
  did: string;
  rkey: string;
  title: string;
  path: string | null;
  publishedAt: string | null;
  tags: string[];
  contentType: string;
  blockCount: number;
  hasCoverImage: boolean;
};

export type OffprintPublication = {
  uri: string;
  did: string;
  pds: string;
  name: string;
  url: string | null;
  posts: OffprintPost[];
};

export async function resolvePds(did: string): Promise<string> {
  let doc = await idResolver.did.resolve(did);
  let service = doc?.service?.find((s) => s.id === "#atproto_pds");
  if (!service || typeof service.serviceEndpoint !== "string")
    throw new Error(`Could not find a PDS for ${did}`);
  return service.serviceEndpoint;
}

export const blobUrl = (pds: string, did: string, cid: string) =>
  `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;

async function resolveUri(uri: string): Promise<AtUri> {
  let parsed: AtUri;
  try {
    parsed = new AtUri(uri.trim());
  } catch {
    throw new Error(`"${uri}" is not an at:// uri`);
  }
  if (!parsed.host.startsWith("did:")) {
    let did = await idResolver.handle.resolve(parsed.host);
    if (!did) throw new Error(`Could not resolve handle ${parsed.host}`);
    parsed.host = did;
  }
  return parsed;
}

async function getRecord<T>(uri: AtUri): Promise<{ pds: string; value: T }> {
  let pds = await resolvePds(uri.host);
  let agent = new AtpBaseClient({ service: pds });
  let res = await agent.com.atproto.repo.getRecord({
    repo: uri.host,
    collection: uri.collection,
    rkey: uri.rkey,
  });
  return { pds, value: res.data.value as T };
}

export async function fetchOffprintPublication(
  uri: string,
): Promise<OffprintPublication> {
  let pubUri = await resolveUri(uri);
  if (pubUri.collection !== "site.standard.publication")
    throw new Error(
      `Expected a site.standard.publication uri, got ${pubUri.collection}`,
    );
  let did = pubUri.host;
  let { pds, value: record } = await getRecord<{ name?: string; url?: string }>(
    pubUri,
  );
  let agent = new AtpBaseClient({ service: pds });

  // Every site.standard.document in the repo, whichever site it belongs to;
  // a repo can hold several publications (Offprint's and Leaflet's, say).
  let posts: OffprintPost[] = [];
  let cursor: string | undefined;
  do {
    let page = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: "site.standard.document",
      limit: 100,
      cursor,
    });
    for (let r of page.data.records) {
      let doc = r.value as OffprintDocument;
      if (doc.site !== pubUri.toString()) continue;
      posts.push({
        uri: r.uri,
        did,
        rkey: new AtUri(r.uri).rkey,
        title: doc.title || "(Untitled)",
        path: doc.path ?? null,
        publishedAt: doc.publishedAt ?? null,
        tags: doc.tags ?? [],
        contentType: doc.content?.$type ?? "(none)",
        blockCount: doc.content?.items?.length ?? 0,
        hasCoverImage: !!doc.coverImage,
      });
    }
    cursor = page.data.cursor;
  } while (cursor);
  // Oldest first, so an import that publishes in list order produces a
  // sensibly-ordered feed.
  posts.sort((a, b) =>
    (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""),
  );

  return {
    uri: pubUri.toString(),
    did,
    pds,
    name: record.name ?? "(Unnamed)",
    url: record.url ?? null,
    posts,
  };
}

export async function fetchOffprintDocument(
  uri: string,
): Promise<{ did: string; pds: string; rkey: string; doc: OffprintDocument }> {
  let docUri = await resolveUri(uri);
  if (docUri.collection !== "site.standard.document")
    throw new Error(
      `Expected a site.standard.document uri, got ${docUri.collection}`,
    );
  let { pds, value } = await getRecord<OffprintDocument>(docUri);
  return { did: docUri.host, pds, rkey: docUri.rkey, doc: value };
}

export async function fetchOffprintComponent(
  uri: string,
): Promise<OffprintComponent> {
  let componentUri = await resolveUri(uri);
  if (componentUri.collection !== "app.offprint.component")
    throw new Error(`${uri} is not an app.offprint.component`);
  return (await getRecord<OffprintComponent>(componentUri)).value;
}
