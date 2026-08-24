"use client";

import { LinearDocumentPage } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/LinearDocumentPage";
import { LeafletContentProvider } from "contexts/LeafletContentContext";
import {
  DocumentProvider,
  type DocumentContextValue,
  type PublicationContext,
} from "contexts/DocumentContext";
import { PublicationThemeProvider } from "components/ThemeManager/PublicationThemeProvider";
import type { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import type { PubLeafletPagesLinearDocument } from "lexicons/api";
import type { PostPageData } from "src/utils/getPostPageData";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import type { Json } from "supabase/database.types";
import type { BlobRef } from "@atproto/lexicon";
import type {
  GhostImportTarget,
  GhostPostPreview as Preview,
} from "actions/admin/importGhost";

// Renders a planned import the way the published post page would, from the
// in-memory record projection: the same LinearDocumentPage the live site uses,
// fed hand-built context values (see theme-settings/PostPreview.tsx for the
// same trick).
export function GhostPostPreview(props: {
  target: GhostImportTarget;
  preview: Preview;
}) {
  let { target, preview } = props;
  let pubRecord = normalizePublicationRecord(target.record as Json);
  let docUri = `at://${target.identity_did}/site.standard.document/${preview.slug}`;

  let normalizedDocument = {
    $type: "site.standard.document" as const,
    title: preview.title,
    description: preview.description,
    publishedAt: preview.publishedAt,
    site: target.uri,
    tags: preview.tags,
    ...(preview.coverImageUrl && {
      // blobRefToSrc passes http(s) links through untouched.
      coverImage: {
        ref: { $link: preview.coverImageUrl },
        mimeType: "image/*",
        size: 0,
      } as unknown as BlobRef,
    }),
  };

  let publication: PublicationContext = {
    uri: target.uri,
    name: target.name,
    identity_did: target.identity_did,
    record: target.record as NonNullable<PublicationContext>["record"],
    newsletterMode: false,
  };

  let contextValue: DocumentContextValue = {
    uri: docUri,
    normalizedDocument,
    normalizedPublication: pubRecord,
    postUrl: `https://leaflet.pub/preview/${preview.slug}`,
    theme: undefined,
    prevNext: undefined,
    quotesAndMentions: [],
    publication,
    commentsCount: 0,
    commentsCountByPage: {},
    mentions: [],
    recommendsCount: 0,
  };

  let document = {
    data: {},
    uri: docUri,
    normalizedDocument,
    normalizedPublication: pubRecord,
    quotesAndMentions: [],
    theme: null,
    prevNext: undefined,
    publication,
    commentsCount: 0,
    commentsCountByPage: {},
    comments_on_documents: [],
    mentions: [],
    document_mentions_in_bsky: [],
    recommendsCount: 0,
    documents_in_publications: [{ publications: publication }],
    recommends_on_documents: [],
  } as unknown as NonNullable<PostPageData>;

  let profile = {
    did: target.identity_did,
    handle: target.handle ?? target.identity_did,
    displayName: target.name,
  } as ProfileViewDetailed;

  let page = {
    $type: "pub.leaflet.pages.linearDocument" as const,
    id: preview.slug,
    blocks: preview.blocks,
  } as PubLeafletPagesLinearDocument.Main & { $type: string };

  return (
    <PublicationThemeProvider
      local
      record={pubRecord}
      pub_creator={target.identity_did}
    >
      <DocumentProvider value={contextValue}>
        <LeafletContentProvider value={{ pages: [page] }}>
          <div className="bg-bg-leaflet w-full overflow-x-auto py-4 px-2 rounded-md">
            <div className="w-fit mx-auto">
              <LinearDocumentPage
                document={document}
                did={target.identity_did}
                profile={profile}
                preferences={{
                  showComments: false,
                  showMentions: false,
                  showRecommends: false,
                  showPrevNext: false,
                }}
                prerenderedCodeBlocks={new Map()}
                bskyPostData={[]}
                standardSitePostData={[]}
                standardSitePublicationData={[]}
                pollData={[]}
                document_uri={docUri}
                fullPageScroll={false}
                hasPageBackground={!!pubRecord?.theme?.showPageBackground}
                blocks={preview.blocks}
              />
            </div>
          </div>
        </LeafletContentProvider>
      </DocumentProvider>
    </PublicationThemeProvider>
  );
}
