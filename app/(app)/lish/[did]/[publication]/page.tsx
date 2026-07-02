"use cache";

import { cacheLife, cacheTag } from "next/cache";
import { pubRouteTag } from "src/cacheTags";
import { BskyAgent } from "@atproto/api";
import React from "react";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { DefaultPublicationHomepage } from "./DefaultPublicationHomepage";
import { buildPublicationPosts } from "./buildPublicationPosts";
import { fetchPublicationForPage } from "./getPublicationForPage";
import { tryRenderPublicationPage } from "./tryRenderPublicationPage";
import { getProfiles } from "src/identity";
import { attachBylineProfiles, bylineDidsForPosts } from "src/utils/byline";
import {
  PublicationThemeProvider,
  PublicationBackgroundProvider,
} from "components/ThemeManager/PublicationThemeProvider";

export default async function Publication(props: {
  params: Promise<{ publication: string; did: string }>;
}) {
  let params = await props.params;
  const did = decodeURIComponent(params.did);
  const publication_name = decodeURIComponent(params.publication);
  cacheLife("hours");
  cacheTag(pubRouteTag(did, publication_name));
  if (!did) return <PubNotFound />;

  const publication = await fetchPublicationForPage(did, publication_name);
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
    // SSR HTML.
    const agent = new BskyAgent({ service: "https://public.api.bsky.app" });
    const homepagePosts = buildPublicationPosts(
      publication.documents_in_publications,
    );
    const [{ data: profile }, bylineProfiles] = await Promise.all([
      agent.getProfile({ actor: did }),
      getProfiles(bylineDidsForPosts(homepagePosts)),
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
            posts={attachBylineProfiles(homepagePosts, bylineProfiles)}
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
