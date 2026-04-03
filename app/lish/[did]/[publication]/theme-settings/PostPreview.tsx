"use client";

import { LinearDocumentPage } from "app/lish/[did]/[publication]/[rkey]/LinearDocumentPage";
import { LeafletContentProvider } from "contexts/LeafletContentContext";
import { DocumentProvider } from "contexts/DocumentContext";
import { useIdentityData } from "components/IdentityProvider";
import type { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import type { PubLeafletPagesLinearDocument } from "lexicons/api";
import type { PostPageData } from "app/lish/[did]/[publication]/[rkey]/getPostPageData";
import type { DocumentContextValue } from "contexts/DocumentContext";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "../dashboard/PublicationSWRProvider";

const FAKE_DID = "did:plc:fake-preview-user";
const FAKE_DOC_URI =
  "at://did:plc:fake-preview-user/site.standard.document/preview";

const fakeBlocks: PubLeafletPagesLinearDocument.Block[] = [
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.header",
      level: 2,
      plaintext: "A Heading",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.text",
      plaintext:
        "This is a preview of what your posts will look like with the current theme settings. You can adjust colors, fonts, and layout options to match your style.",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.text",
      plaintext:
        "Try changing the heading font, body font, accent color, and background to see how they affect the look and feel of your publication.",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.horizontalRule",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.text",
      plaintext:
        "Your readers will see posts rendered just like this. Make sure you're happy with the typography and spacing before publishing!",
    },
  },
];

const fakePage: PubLeafletPagesLinearDocument.Main = {
  $type: "pub.leaflet.pages.linearDocument",
  id: "preview-page",
  blocks: fakeBlocks,
};

const fakeNormalizedDocument = {
  $type: "site.standard.document" as const,
  title: "Preview Post Title",
  description: "A short description of this preview post.",
  publishedAt: new Date().toISOString(),
  site: "at://did:plc:fake-preview-user/site.standard.publication/preview",
  tags: ["preview", "theme"],
};

const fakeDocument: NonNullable<PostPageData> = {
  data: {},
  uri: FAKE_DOC_URI,
  normalizedDocument: fakeNormalizedDocument,
  normalizedPublication: null,
  quotesAndMentions: [],
  theme: null,
  prevNext: undefined,
  publication: null,
  comments: [],
  comments_on_documents: [],
  mentions: [],
  document_mentions_in_bsky: [],
  leaflets_in_publications: [],
  leafletId: null,
  recommendsCount: 0,
  documents_in_publications: [],
  recommends_on_documents: [],
} as unknown as NonNullable<PostPageData>;

const fakeDocumentContextValue: DocumentContextValue = {
  uri: FAKE_DOC_URI,
  normalizedDocument: fakeNormalizedDocument,
  normalizedPublication: null,
  theme: undefined,
  prevNext: undefined,
  quotesAndMentions: [],
  publication: null,
  comments: [],
  mentions: [],
  leafletId: null,
  recommendsCount: 0,
};

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
        <div className="w-fit pointer-events-none">
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
