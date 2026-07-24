import { BskyAgent } from "@atproto/api";
import React from "react";
import type { Metadata } from "next";
import { supabaseServerClient } from "supabase/serverClient";
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { publicationAlternates } from "./publicationAlternates";
import { DefaultPublicationHomepage } from "./DefaultPublicationHomepage";
import { buildPublicationPosts } from "./buildPublicationPosts";
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

export async function generateMetadata(props: {
  params: Promise<{ publication: string; did: string }>;
}): Promise<Metadata> {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  if (!did || !params.publication) return {};

  let { data: publications } = await supabaseServerClient
    .from("publications")
    .select("uri, record")
    .eq("identity_did", did)
    .or(publicationNameOrUriFilter(did, decodeURIComponent(params.publication)))
    .order("uri", { ascending: false })
    .limit(1);

  let alternates = publicationAlternates(
    normalizePublicationRecord(publications?.[0]?.record),
    "/",
  );
  return alternates ? { alternates } : {};
}

export default async function Publication(props: {
  params: Promise<{ publication: string; did: string }>;
}) {
  console.log("are we getting here??");
  let params = await props.params;
  const did = decodeURIComponent(params.did);
  if (!did) return <PubNotFound />;
  const publication_name = decodeURIComponent(params.publication);

  const publication = await fetchPublicationForPage(did, publication_name);
  console.log(publication);
  if (!publication) return <PubNotFound />;

  try {
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
  } catch (e) {
    console.log(e);
    return <pre>{JSON.stringify(e, undefined, 2)}</pre>;
  }
}

const PubNotFound = () => {
  return (
    <NotFoundLayout>
      <p className="font-bold">Sorry, we can't find this publication!</p>
      <p>
        This may be a glitch on our end. If the issue persists please{" "}
        <a href="mailto:contact@leaflet.pub">send us a note</a>.
      </p>
    </NotFoundLayout>
  );
};
