import { AtUri } from "@atproto/api";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { getConstellationBacklinks } from "app/lish/[did]/[publication]/[rkey]/getPostPageData";
import { getDocumentURL } from "app/lish/createPub/getPublicationURL";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";
import { idResolver } from "./idResolver";
import type { Post } from "./getReaderFeed";

type RawDocument = {
  data: unknown;
  uri: string;
  sort_date: string;
  comments_on_documents: { count: number }[];
  document_mentions_in_bsky: { count: number }[];
  recommends_on_documents: { count: number }[];
  documents_in_publications: {
    publications: {
      uri: string;
      record: unknown;
      name: string | null;
      [key: string]: unknown;
    } | null;
  }[];
};

export async function enrichDocumentToPost(
  doc: RawDocument,
): Promise<Post | null> {
  const pub = doc.documents_in_publications?.[0]?.publications;
  const uri = new AtUri(doc.uri);
  const handle = await idResolver.did.resolve(uri.host);

  const normalizedData = normalizeDocumentRecord(doc.data, doc.uri);
  if (!normalizedData) return null;

  const normalizedPubRecord = pub
    ? normalizePublicationRecord(pub.record)
    : null;

  const mentionsCount = await getAccurateMentionsCount(
    normalizedData,
    doc.uri,
    normalizedPubRecord,
    doc.document_mentions_in_bsky?.[0]?.count || 0,
  );

  return {
    publication: pub
      ? {
          href: getPublicationURL(pub),
          pubRecord: normalizedPubRecord,
          uri: pub.uri || "",
        }
      : undefined,
    author: handle?.alsoKnownAs?.[0]
      ? `@${handle.alsoKnownAs[0].slice(5)}`
      : null,
    documents: {
      comments_on_documents: doc.comments_on_documents,
      document_mentions_in_bsky: doc.document_mentions_in_bsky,
      recommends_on_documents: doc.recommends_on_documents,
      mentionsCount,
      data: normalizedData,
      uri: doc.uri,
      sort_date: doc.sort_date,
    },
  };
}

async function getAccurateMentionsCount(
  normalizedData: NonNullable<ReturnType<typeof normalizeDocumentRecord>>,
  docUri: string,
  normalizedPubRecord: ReturnType<typeof normalizePublicationRecord>,
  dbMentionsCount: number,
): Promise<number> {
  const postUrl = getDocumentURL(normalizedData, docUri, normalizedPubRecord);
  const absoluteUrl = postUrl.startsWith("/")
    ? `https://leaflet.pub${postUrl}`
    : postUrl;
  const constellationBacklinks = await getConstellationBacklinks(absoluteUrl);
  const uniqueBacklinkCount = new Set(
    constellationBacklinks.map((b) => b.uri),
  ).size;
  return dbMentionsCount + uniqueBacklinkCount;
}
