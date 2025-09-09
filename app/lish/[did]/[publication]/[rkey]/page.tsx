import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import { ids } from "lexicons/api/lexicons";
import {
  PubLeafletBlocksBskyPost,
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
  PubLeafletPublication,
} from "lexicons/api";
import { Metadata } from "next";
import { AtpAgent } from "@atproto/api";
import { QuoteHandler } from "./QuoteHandler";
import { InteractionDrawer } from "./Interactions/InteractionDrawer";
import {
  PublicationBackgroundProvider,
  PublicationThemeProvider,
} from "components/ThemeManager/PublicationThemeProvider";
import { getPostPageData } from "./getPostPageData";
import { PostPageContextProvider } from "./PostPageContext";
import { PostPage } from "./PostPage";
import { PageLayout } from "./PageLayout";
import { extractCodeBlocks } from "./extractCodeBlocks";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";

export async function generateMetadata(props: {
  params: Promise<{ publication: string; did: string; rkey: string }>;
}): Promise<Metadata> {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  let publication = decodeURIComponent(params.publication);
  if (!did) return { title: "Publication 404" };

  let [{ data: document }] = await Promise.all([
    supabaseServerClient
      .from("documents")
      .select("*")
      .eq("uri", AtUri.make(did, ids.PubLeafletDocument, params.rkey))
      .single(),
  ]);
  if (!document) return { title: "404" };

  let docRecord = document.data as PubLeafletDocument.Record;

  return {
    title: docRecord.title + " - " + publication,
    description: docRecord?.description || "",
  };
}
export default async function Post(props: {
  params: Promise<{ publication: string; did: string; rkey: string }>;
}) {
  let did = decodeURIComponent((await props.params).did);
  if (!did)
    return (
      <div className="p-4 text-lg text-center flex flex-col gap-4">
        <p>Sorry, can&apos;t resolve handle.</p>
        <p>
          This may be a glitch on our end. If the issue persists please{" "}
          <a href="mailto:contact@leaflet.pub">send us a note</a>.
        </p>
      </div>
    );
  let agent = new AtpAgent({
    service: "https://public.api.bsky.app",
    fetch: (...args) =>
      fetch(args[0], {
        ...args[1],
        cache: "no-store",
        next: { revalidate: 3600 },
      }),
  });
  let [document, profile] = await Promise.all([
    getPostPageData(
      AtUri.make(
        did,
        ids.PubLeafletDocument,
        (await props.params).rkey,
      ).toString(),
    ),
    agent.getProfile({ actor: did }),
  ]);
  if (!document?.data || !document.documents_in_publications[0].publications)
    return (
      <NotFoundLayout>
        <p className="font-bold">Sorry, we can't find this post!</p>
        <p>
          This may be a glitch on our end. If the issue persists please{" "}
          <a href="mailto:contact@leaflet.pub">send us a note</a>.
        </p>
      </NotFoundLayout>
    );
  let record = document.data as PubLeafletDocument.Record;
  let bskyPosts = record.pages.flatMap((p) => {
    let page = p as PubLeafletPagesLinearDocument.Main;
    return page.blocks?.filter(
      (b) => b.block.$type === ids.PubLeafletBlocksBskyPost,
    );
  });
  let bskyPostData =
    bskyPosts.length > 0
      ? await agent.getPosts(
          {
            uris: bskyPosts
              .map((p) => {
                let block = p?.block as PubLeafletBlocksBskyPost.Main;
                return block.postRef.uri;
              })
              .slice(0, 24),
          },
          { headers: {} },
        )
      : { data: { posts: [] } };
  let firstPage = record.pages[0];
  let blocks: PubLeafletPagesLinearDocument.Block[] = [];
  if (PubLeafletPagesLinearDocument.isMain(firstPage)) {
    blocks = firstPage.blocks || [];
  }

  let pubRecord = document.documents_in_publications[0]?.publications
    .record as PubLeafletPublication.Record;

  let hasPageBackground = !!pubRecord.theme?.showPageBackground;
  let prerenderedCodeBlocks = await extractCodeBlocks(blocks);

  return (
    <PostPageContextProvider value={document}>
      <PublicationThemeProvider
        record={pubRecord}
        pub_creator={
          document.documents_in_publications[0].publications.identity_did
        }
      >
        <PublicationBackgroundProvider
          record={pubRecord}
          pub_creator={
            document.documents_in_publications[0].publications.identity_did
          }
        >
          {/*
          TODO: SCROLL PAGE TO FIT DRAWER
          If the drawer fits without scrolling, dont scroll
          If both drawer and page fit if you scrolled it, scroll it all into the center
          If the drawer and pafe doesn't all fit, scroll to drawer

          TODO: SROLL BAR
          If there is no drawer && there is no page bg, scroll the entire page
          If there is either a drawer open OR a page background, scroll just the post content

          TODO: HIGHLIGHTING BORKED
          on chrome, if you scroll backward, things stop working
          seems like if you use an older browser, sel direction is not a thing yet
           */}
          <PageLayout>
            <PostPage
              preferences={pubRecord.preferences || {}}
              pubRecord={pubRecord}
              profile={JSON.parse(JSON.stringify(profile.data))}
              document={document}
              bskyPostData={bskyPostData.data.posts}
              did={did}
              blocks={blocks}
              name={decodeURIComponent((await props.params).publication)}
              prerenderedCodeBlocks={prerenderedCodeBlocks}
            />
            <InteractionDrawer
              document_uri={document.uri}
              comments={
                pubRecord.preferences?.showComments === false
                  ? []
                  : document.comments_on_documents
              }
              quotes={document.document_mentions_in_bsky}
              did={did}
            />
          </PageLayout>

          <QuoteHandler />
        </PublicationBackgroundProvider>
      </PublicationThemeProvider>
    </PostPageContextProvider>
  );
}
