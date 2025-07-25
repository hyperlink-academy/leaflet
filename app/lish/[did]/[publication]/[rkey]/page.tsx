import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import { ids } from "lexicons/api/lexicons";
import {
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

export async function generateMetadata(props: {
  params: Promise<{ publication: string; did: string; rkey: string }>;
}): Promise<Metadata> {
  let did = decodeURIComponent((await props.params).did);
  if (!did) return { title: "Publication 404" };

  let [{ data: document }] = await Promise.all([
    supabaseServerClient
      .from("documents")
      .select("*")
      .eq(
        "uri",
        AtUri.make(did, ids.PubLeafletDocument, (await props.params).rkey),
      )
      .single(),
  ]);

  if (!document) return { title: "404" };
  let record = document.data as PubLeafletDocument.Record;
  return {
    title:
      record.title +
      " - " +
      decodeURIComponent((await props.params).publication),
    description: record?.description || "",
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
  let agent = new AtpAgent({ service: "https://public.api.bsky.app" });
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
      <div className="p-4 text-lg text-center flex flex-col gap-4">
        <p>Sorry, post not found!</p>
        <p>
          This may be a glitch on our end. If the issue persists please{" "}
          <a href="mailto:contact@leaflet.pub">send us a note</a>.
        </p>
      </div>
    );
  let record = document.data as PubLeafletDocument.Record;
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
              pubRecord={pubRecord}
              profile={profile.data}
              document={document}
              did={did}
              blocks={blocks}
              name={decodeURIComponent((await props.params).publication)}
              prerenderedCodeBlocks={prerenderedCodeBlocks}
            />
            <InteractionDrawer
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
