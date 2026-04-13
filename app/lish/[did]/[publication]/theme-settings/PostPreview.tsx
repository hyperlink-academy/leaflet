"use client";

import { LinearDocumentPage } from "app/lish/[did]/[publication]/[rkey]/LinearDocumentPage";
import { LeafletContentProvider } from "contexts/LeafletContentContext";
import {
  DocumentProvider,
  type PublicationContext,
} from "contexts/DocumentContext";
import { useIdentityData } from "components/IdentityProvider";
import type { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import type { PubLeafletPagesLinearDocument } from "lexicons/api";
import type { PostPageData } from "app/lish/[did]/[publication]/[rkey]/getPostPageData";
import type { DocumentContextValue } from "contexts/DocumentContext";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "../dashboard/PublicationSWRProvider";
import { fakeBlocks, fakePage } from "./postPreviewFakeBlocks";

const FAKE_DID = "did:plc:fake-preview-user";
const FAKE_DOC_URI =
  "at://did:plc:fake-preview-user/site.standard.document/preview";

const fakeNormalizedDocument = {
  $type: "site.standard.document" as const,
  title: "Building your Dream Theme!",
  description: "A short description of this preview post.",
  publishedAt: new Date().toISOString(),
  site: "at://did:plc:fake-preview-user/site.standard.publication/preview",
  tags: ["preview", "theme"],
};

function makeFakeDocument(
  publication?: {
    uri: string;
    name: string;
    identity_did: string;
    record: unknown;
  } | null,
): NonNullable<PostPageData> {
  return {
    data: {},
    uri: FAKE_DOC_URI,
    normalizedDocument: fakeNormalizedDocument,
    normalizedPublication: null,
    quotesAndMentions: [],
    theme: null,
    prevNext: undefined,
    publication: publication || null,
    comments: [],
    comments_on_documents: [],
    mentions: [],
    document_mentions_in_bsky: [],
    leaflets_in_publications: [],
    leafletId: null,
    recommendsCount: 0,
    documents_in_publications: publication
      ? [{ publications: publication }]
      : [],
    recommends_on_documents: [],
  } as unknown as NonNullable<PostPageData>;
}

export function PostPreview(props: {
  showPageBackground: boolean;
  pageWidth: number;
}) {
  let { identity } = useIdentityData();
  let { data } = usePublicationData();
  let { publication } = data || {};
  let record = useNormalizedPublicationRecord();
  let preferences = record?.preferences;
  let profileRecord = identity?.bsky_profiles
    ?.record as unknown as ProfileViewDetailed;

  let profile = profileRecord ?? {
    did: FAKE_DID,
    handle: "preview.bsky.social",
    displayName: "Preview Author",
  };

  let pubInfo: PublicationContext = publication
    ? {
        uri: publication.uri,
        name: publication.name,
        identity_did: publication.identity_did,
        record: publication.record as NonNullable<PublicationContext>["record"],
        publication_subscriptions: (
          publication.publication_subscriptions || []
        ).map((s) => ({
          created_at: s.created_at,
          identity: s.identity,
          publication: s.publication,
          record: s.record,
          uri: s.uri,
        })),
      }
    : null;

  let fakeDocument = makeFakeDocument(pubInfo);

  let fakeDocumentContextValue: DocumentContextValue = {
    uri: FAKE_DOC_URI,
    normalizedDocument: fakeNormalizedDocument,
    normalizedPublication: null,
    theme: undefined,
    prevNext: undefined,
    quotesAndMentions: [],
    publication: pubInfo,
    comments: [],
    mentions: [],
    leafletId: null,
    recommendsCount: 0,
  };

  return (
    <DocumentProvider value={fakeDocumentContextValue}>
      <LeafletContentProvider
        value={{
          pages: [
            fakePage as PubLeafletPagesLinearDocument.Main & {
              $type: string;
            },
          ],
        }}
      >
        <div className="w-fit h-full py-2 sm:py-6">
          <LinearDocumentPage
            document={fakeDocument}
            did={profile.did || FAKE_DID}
            profile={profile as ProfileViewDetailed}
            preferences={{
              showComments: preferences?.showComments,
              showMentions: preferences?.showMentions,
              showRecommends: preferences?.showRecommends,
              showPrevNext: preferences?.showPrevNext,
            }}
            prerenderedCodeBlocks={new Map()}
            bskyPostData={[]}
            pollData={[]}
            document_uri={FAKE_DOC_URI}
            fullPageScroll={!props.showPageBackground}
            hasPageBackground={props.showPageBackground}
            blocks={fakeBlocks}
          />
        </div>
      </LeafletContentProvider>
    </DocumentProvider>
  );
}
