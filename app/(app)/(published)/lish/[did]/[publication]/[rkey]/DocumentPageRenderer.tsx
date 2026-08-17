import { AtpAgent } from "@atproto/api";
import {
  PubLeafletPagesLinearDocument,
  PubLeafletPagesCanvas,
} from "lexicons/api";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { QuoteHandler } from "./QuoteHandler";
import {
  PublicationBackgroundProvider,
  PublicationThemeProvider,
} from "components/ThemeManager/PublicationThemeProvider";
import { getPostPageData, type PostPageData } from "src/utils/getPostPageData";
import { PostPages } from "./PostPages";
import { collectAndFetchBlockResources } from "./collectAndFetchBlockResources";
import { LeafletLayout } from "components/LeafletLayout";
import { getDocumentPages } from "src/utils/normalizeRecords";
import { PostDataProvider } from "./PostDataProvider";
import { FontLoader } from "components/FontLoader";
import { mergePreferences } from "src/utils/mergePreferences";
import { CommentsSection } from "./Interactions/Comments/CommentsSection";
import { getProfiles } from "src/identity/profileCache";
import {
  getBylineDids,
  hasExplicitByline,
  namedBylineProfiles,
  toBylineProfiles,
  type BylineProfile,
} from "src/utils/byline";
import { JsonLd } from "components/JsonLd";
import { collectPostImages } from "./collectPostImages";
import { getPublicationURL } from "src/utils/getPublicationURL";
import { blobRefToSrc } from "src/utils/blobRefToSrc";

export async function DocumentPageRenderer({
  did,
  rkey,
  publication,
  openPageId,
}: {
  did: string;
  rkey: string;
  publication?: string;
  openPageId?: string;
}) {
  let agent = new AtpAgent({
    service: "https://public.api.bsky.app",
    fetch: (...args) =>
      fetch(args[0], {
        ...args[1],
        next: { revalidate: 3600 },
      }),
  });

  let [document, profile] = await Promise.all([
    getPostPageData(did, rkey, publication),
    agent.getProfile({ actor: did }).then(
      (res) => res.data,
      () => undefined,
    ),
  ]);

  const record = document?.normalizedDocument;

  const pages = record ? getDocumentPages(record) : undefined;

  if (!document?.data || !record || !pages) notFound();

  // Resolve byline contributors. When the document has a non-empty
  // `contributors` array, render those profiles; otherwise fall back to the
  // single document author (the host DID of the document URI). When the byline
  // is just the author we leave `contributors` undefined so PostHeader uses its
  // existing single-`profile` render path (byte-for-byte the same as before).
  let contributorProfiles;
  if (hasExplicitByline(record, did)) {
    const bylineDids = getBylineDids(record, did);
    contributorProfiles = toBylineProfiles(
      bylineDids,
      await getProfiles(bylineDids),
    );
  }

  const {
    bskyPostData,
    standardSitePostData: standardSitePosts,
    standardSitePublicationData,
    pollData,
    prerenderedCodeBlocks,
  } = await collectAndFetchBlockResources({
    agent,
    pages: pages as (
      | PubLeafletPagesLinearDocument.Main
      | PubLeafletPagesCanvas.Main
    )[],
    openPageId,
  });

  const pubRecord = document.normalizedPublication;
  let pub_creator = document.publication?.identity_did || did;
  let isStandalone = !pubRecord;

  const jsonLd = buildPostJsonLd({
    document,
    pages: pages as (
      | PubLeafletPagesLinearDocument.Main
      | PubLeafletPagesCanvas.Main
    )[],
    did,
    rkey,
    publication,
    profile,
    contributorProfiles,
    pub_creator,
  });

  return (
    <PostDataProvider
      document={document}
      initial={{
        pages,
        bskyPostData: JSON.parse(JSON.stringify(bskyPostData)),
        standardSitePostData: JSON.parse(JSON.stringify(standardSitePosts)),
        standardSitePublicationData: JSON.parse(
          JSON.stringify(standardSitePublicationData),
        ),
        pollData,
      }}
    >
      <JsonLd data={jsonLd} />
      <FontLoader
        headingFontId={document.theme?.headingFont}
        bodyFontId={document.theme?.bodyFont}
      />
      <PublicationThemeProvider
        record={{ theme: document.theme }}
        pub_creator={pub_creator}
        isStandalone={isStandalone}
      >
        <PublicationBackgroundProvider
          record={{ theme: document.theme }}
          pub_creator={pub_creator}
        >
          <LeafletLayout>
            <PostPages
              document_uri={document.uri}
              preferences={mergePreferences(
                record?.preferences,
                pubRecord?.preferences,
              )}
              pubRecord={pubRecord}
              profile={
                profile ? JSON.parse(JSON.stringify(profile)) : undefined
              }
              contributors={contributorProfiles}
              document={document}
              did={did}
              prerenderedCodeBlocks={prerenderedCodeBlocks}
              commentsSlot={
                <Suspense fallback={null}>
                  <CommentsSection document_uri={document.uri} />
                </Suspense>
              }
            />
          </LeafletLayout>

          <QuoteHandler />
        </PublicationBackgroundProvider>
      </PublicationThemeProvider>
    </PostDataProvider>
  );
}

function buildPostJsonLd({
  document,
  pages,
  did,
  rkey,
  publication,
  profile,
  contributorProfiles,
  pub_creator,
}: {
  document: NonNullable<PostPageData>;
  pages: (PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main)[];
  did: string;
  rkey: string;
  publication?: string;
  profile?: { displayName?: string; handle: string };
  contributorProfiles?: BylineProfile[];
  pub_creator: string;
}) {
  const record = document.normalizedDocument;

  // Absolute canonical URL, matching the metadata layer: the record-derived
  // URL when it's a real web URL (postUrl can be relative in dev/preview or an
  // AT-URI for odd records), else this route on leaflet.pub.
  const routeUrl = publication
    ? `https://leaflet.pub/lish/${did}/${encodeURIComponent(publication)}/${encodeURIComponent(rkey)}`
    : `https://leaflet.pub/p/${did}/${rkey}`;
  const url = document.postUrl.startsWith("/")
    ? `https://leaflet.pub${document.postUrl}`
    : /^https?:\/\//.test(document.postUrl)
      ? document.postUrl
      : routeUrl;

  const images = pages
    .flatMap((page) => collectPostImages(page, did))
    .map((image) => image.fullSrc ?? image.src)
    .map((src) => (src.startsWith("/") ? `https://leaflet.pub${src}` : src))
    .slice(0, 5);

  const author = contributorProfiles
    ? namedBylineProfiles(contributorProfiles).map((p) => ({
        "@type": "Person" as const,
        name: p.displayName || p.handle || "",
        url: `https://leaflet.pub/p/${p.did}`,
      }))
    : profile
      ? [
          {
            "@type": "Person" as const,
            name: profile.displayName || profile.handle,
            url: `https://leaflet.pub/p/${did}`,
          },
        ]
      : [];

  const pub = document.publication;
  const pubRecord = document.normalizedPublication;
  let publisher;
  if (pub) {
    const pubUrl = getPublicationURL(pub);
    publisher = {
      "@type": "Organization" as const,
      name: pubRecord?.name ?? pub.name,
      url: pubUrl.startsWith("/") ? `https://leaflet.pub${pubUrl}` : pubUrl,
      ...(pubRecord?.icon
        ? {
            logo: blobRefToSrc(
              pubRecord.icon.ref,
              pub_creator,
              "https://leaflet.pub",
            ),
          }
        : {}),
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: record.title,
    url,
    mainEntityOfPage: url,
    ...(record.description ? { description: record.description } : {}),
    ...(record.publishedAt ? { datePublished: record.publishedAt } : {}),
    ...(images.length > 0 ? { image: images } : {}),
    ...(author.length > 0 ? { author } : {}),
    ...(publisher ? { publisher } : {}),
    ...(document.membersOnly.gated
      ? {
          isAccessibleForFree: false,
          hasPart: {
            "@type": "WebPageElement" as const,
            isAccessibleForFree: false,
            cssSelector: ".membersOnlyPaywall",
          },
        }
      : {}),
  };
}
