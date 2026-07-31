import { BskyAgent } from "@atproto/api";
import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { publicationAlternates } from "./publicationAlternates";
import { DefaultPublicationHomepage } from "./DefaultPublicationHomepage";
import { buildPublicationPosts } from "src/utils/buildPublicationPosts";
import {
  fetchPublicationForPage,
  fetchPublicationPostRows,
} from "./getPublicationForPage";
import { tryRenderPublicationPage } from "./tryRenderPublicationPage";
import { getProfiles } from "src/identity";
import { attachBylineProfiles, bylineDidsForPosts } from "src/utils/byline";
import {
  PublicationThemeProvider,
  PublicationBackgroundProvider,
} from "components/ThemeManager/PublicationThemeProvider";

// On-demand ISR: rendered on first request, then served from the CDN and
// re-rendered in the background. The empty generateStaticParams is what opts a
// dynamic-params route into caching at all — `revalidate` alone leaves it
// fully dynamic. Writes invalidate eagerly via revalidatePublicationPaths.
export const revalidate = 300;
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata(props: {
  params: Promise<{ publication: string; did: string }>;
}): Promise<Metadata> {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  if (!did || !params.publication) return {};

  // Same fetcher the page body uses, so the two share one query.
  let publication = await fetchPublicationForPage(
    did,
    decodeURIComponent(params.publication),
  );

  let alternates = publicationAlternates(
    normalizePublicationRecord(publication?.record),
    "/",
  );
  return alternates ? { alternates } : {};
}

export default async function Publication(props: {
  params: Promise<{ publication: string; did: string }>;
}) {
  let params = await props.params;
  const did = decodeURIComponent(params.did);
  if (!did) notFound();
  const publication_name = decodeURIComponent(params.publication);

  const publication = await fetchPublicationForPage(did, publication_name);
  if (!publication) notFound();

  // Render a published "/" page when one exists; otherwise fall back to the
  // legacy post-listing homepage.
  const homePageRender = tryRenderPublicationPage({
    did,
    publication,
    path: "/",
  });
  if (homePageRender) return homePageRender;

  const record = normalizePublicationRecord(publication.record);
  // Resolve the author profile and post bylines server-side so they're in the
  // SSR HTML. The profile lookup is independent of the post queries, so it
  // runs alongside the rows → bylines chain.
  const agent = new BskyAgent({ service: "https://public.api.bsky.app" });
  const [{ data: profile }, posts] = await Promise.all([
    agent.getProfile({ actor: did }),
    fetchPublicationPostRows(publication.uri).then(async (rows) => {
      const posts = buildPublicationPosts(rows);
      return attachBylineProfiles(
        posts,
        await getProfiles(bylineDidsForPosts(posts)),
      );
    }),
  ]);
  return (
    <PublicationThemeProvider
      record={record}
      pub_creator={publication.identity_did}
    >
      <PublicationBackgroundProvider
        record={record}
        pub_creator={publication.identity_did}
      >
        <DefaultPublicationHomepage
          record={record}
          publication={publication}
          did={did}
          profile={profile}
          showPageBackground={record?.theme?.showPageBackground}
          posts={posts}
        />
      </PublicationBackgroundProvider>
    </PublicationThemeProvider>
  );
}
