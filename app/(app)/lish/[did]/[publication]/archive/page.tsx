import React from "react";
import type { Metadata } from "next";
import { supabaseServerClient } from "supabase/serverClient";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { FontLoader } from "components/FontLoader";
import {
  PublicationThemeProvider,
  PublicationBackgroundProvider,
} from "components/ThemeManager/PublicationThemeProvider";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import { publishedNavPages } from "src/utils/publishedPageMetadata";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { wordmarkFromTheme } from "src/utils/wordmark";
import {
  getDocumentURL,
  getPublicationURL,
} from "app/(app)/lish/createPub/getPublicationURL";
import { DocumentPageRenderer } from "../[rkey]/DocumentPageRenderer";
import { postPageMetadata } from "../[rkey]/postPageMetadata";
import { buildPublicationPosts } from "../buildPublicationPosts";
import { fetchPublicationForPage } from "../getPublicationForPage";
import { tryRenderPublicationPage } from "../tryRenderPublicationPage";
import { resolveDocumentFilter } from "../resolveDocumentFilter";
import { publicationAlternates } from "../publicationAlternates";
import { PublicationHomeLayout } from "../PublicationHomeLayout";
import { LocalizedDate } from "../LocalizedDate";

// The archive exists so every post is reachable through plain server-rendered
// anchors — crawlers can't drive the home page's infinite scroll past its
// first batch.

export async function generateMetadata(props: {
  params: Promise<{ publication: string; did: string }>;
}): Promise<Metadata> {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  if (!did) return { title: "Publication 404" };

  // A page or post published at the /archive path shadows the built-in
  // archive, so serve its metadata (matching the page body below).
  let published = await postPageMetadata({
    did: params.did,
    publication: params.publication,
    segment: "archive",
  });
  if (published) return published;

  let { data: publications } = await supabaseServerClient
    .from("publications")
    .select("name, record")
    .eq("identity_did", did)
    .or(publicationNameOrUriFilter(did, decodeURIComponent(params.publication)))
    .order("uri", { ascending: false })
    .limit(1);
  let publication = publications?.[0];
  if (!publication) return { title: "Publication 404" };

  let pubRecord = normalizePublicationRecord(publication.record);
  return {
    title: `Archive - ${pubRecord?.name || publication.name}`,
    alternates: publicationAlternates(pubRecord, "/archive"),
  };
}

export default async function PublicationArchive(props: {
  params: Promise<{ publication: string; did: string }>;
}) {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  let publication_name = decodeURIComponent(params.publication);
  if (!did) return <ArchiveNotFound />;

  const publication = await fetchPublicationForPage(did, publication_name);
  if (!publication) return <ArchiveNotFound />;

  // This static segment wins over the [rkey] route, so anything published at
  // the /archive path would be shadowed — render it instead, the way [rkey]
  // would have.
  const pageRender = tryRenderPublicationPage({
    did,
    publication,
    path: "/archive",
  });
  if (pageRender) return pageRender;
  let { data: shadowingDocs } = await supabaseServerClient
    .from("documents")
    .select("uri")
    .or(await resolveDocumentFilter(did, publication_name, "archive"))
    .limit(1);
  if (shadowingDocs?.[0])
    return (
      <DocumentPageRenderer
        did={did}
        rkey="archive"
        publication={publication_name}
      />
    );

  const record = normalizePublicationRecord(publication.record);
  const posts = buildPublicationPosts(publication.documents_in_publications)
    .slice()
    .sort((a, b) => {
      const aDate = a.record.publishedAt
        ? new Date(a.record.publishedAt).getTime()
        : 0;
      const bDate = b.record.publishedAt
        ? new Date(b.record.publishedAt).getTime()
        : 0;
      return bDate - aDate;
    });

  return (
    <PublicationThemeProvider
      record={record}
      pub_creator={publication.identity_did}
    >
      <PublicationBackgroundProvider
        record={record}
        pub_creator={publication.identity_did}
      >
        <FontLoader
          headingFontId={record?.theme?.headingFont}
          bodyFontId={record?.theme?.bodyFont}
        />
        <PublicationHomeLayout
          showPageBackground={!!record?.theme?.showPageBackground}
          iconUrl={record?.icon ? blobRefToSrc(record.icon.ref, did) : undefined}
          wordmark={wordmarkFromTheme(record?.theme, did)}
          navPages={publishedNavPages(publication.publication_pages)}
          publicationUrl={getPublicationURL(publication)}
          activePath="/archive"
          pageWidth={record?.theme?.pageWidth}
          subscribe={{
            publicationUri: publication.uri,
            publicationUrl: record?.url,
            publicationName: record?.name ?? publication.name,
            publicationDescription: record?.description,
            newsletterMode:
              !!publication.publication_newsletter_settings?.enabled,
          }}
        >
          <div className="flex flex-col gap-3 px-3 sm:px-4">
            <h2 className="text-primary">Archive</h2>
            <ul className="flex flex-col gap-2 list-none pl-0">
              {posts.map((post) => (
                <li
                  key={post.uri}
                  className="flex flex-wrap items-baseline gap-x-2"
                >
                  <a
                    href={getDocumentURL(post.record, post.uri, publication)}
                    className="publishedPost text-primary no-underline! hover:underline!"
                  >
                    {post.record.title || "Untitled"}
                  </a>
                  {post.record.publishedAt && (
                    <span className="text-tertiary text-sm whitespace-nowrap">
                      <LocalizedDate
                        dateString={post.record.publishedAt}
                        options={{
                          year: "numeric",
                          month: "long",
                          day: "2-digit",
                        }}
                      />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </PublicationHomeLayout>
      </PublicationBackgroundProvider>
    </PublicationThemeProvider>
  );
}

const ArchiveNotFound = () => {
  return (
    <NotFoundLayout>
      <p className="font-bold">Sorry, we can&apos;t find this publication!</p>
      <p>
        This may be a glitch on our end. If the issue persists please{" "}
        <a href="mailto:contact@leaflet.pub">send us a note</a>.
      </p>
    </NotFoundLayout>
  );
};
