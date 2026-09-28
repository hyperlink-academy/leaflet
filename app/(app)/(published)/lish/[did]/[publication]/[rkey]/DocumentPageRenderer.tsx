import {
  PubLeafletPagesLinearDocument,
  PubLeafletPagesCanvas,
} from "lexicons/api";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { type PostPageData } from "src/utils/getPostPageData";
import { FontLoader } from "components/FontLoader";
import { CommentsSection } from "./Interactions/Comments/CommentsSection";
import { namedBylineProfiles, type BylineProfile } from "src/utils/byline";
import { JsonLd } from "components/JsonLd";
import { collectPostImages } from "./collectPostImages";
import { getPublicationURL } from "src/utils/getPublicationURL";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { loadPostPage } from "./loadPostPage";
import { PostPageShell } from "./PostPageShell";

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
  const post = await loadPostPage({ did, rkey, publication, openPageId });
  if (!post) notFound();
  const { document, pages, profile, contributorProfiles } = post;

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
    pub_creator: document.publication?.identity_did || did,
  });

  return (
    <PostPageShell
      post={post}
      commentsSlot={
        <Suspense fallback={null}>
          <CommentsSection document_uri={document.uri} />
        </Suspense>
      }
    >
      <JsonLd data={jsonLd} />
      <FontLoader
        headingFontId={document.theme?.headingFont}
        bodyFontId={document.theme?.bodyFont}
      />
    </PostPageShell>
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
