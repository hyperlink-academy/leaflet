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
import { PostHeader } from "./PostHeader/PostHeader";
import { Interactions } from "./Interactions/Interactions";
import { InteractionDrawer } from "./Interactions/InteractionDrawer";
import { SubscribeWithBluesky } from "app/lish/Subscribe";
import {
  PublicationBackgroundProvider,
  PublicationThemeProvider,
} from "components/ThemeManager/PublicationThemeProvider";
import { PostContent } from "./PostContent";
import { getIdentityData } from "actions/getIdentityData";
import { EditTiny } from "components/Icons/EditTiny";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { getPostPageData } from "./getPostPageData";
import { PostPageContextProvider } from "./PostPageContext";

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
  let identity = await getIdentityData();
  let document = await getPostPageData(
    AtUri.make(
      did,
      ids.PubLeafletDocument,
      (await props.params).rkey,
    ).toString(),
  );
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
          <div
            className="post w-full relative overflow-x-scroll snap-x snap-mandatory no-scrollbar grow items-stretch flex h-full pwa-padding"
            id="page-carousel"
          >
            {/* if you adjust this padding, remember to adjust the negative margins on page in Pages/index when card borders are hidden (also applies for the pb in the parent div)*/}
            <div id="pages" className="postWrapper flex py-2 sm:py-6">
              <div
                className="spacer"
                style={{ width: `calc(50vw - ((var(--page-width-units)/2))` }}
              />
              <div id="page" className="flex gap-6 h-full">
                <div
                  className={`relative sm:max-w-prose w-[var(--page-width-units)] mx-auto px-3 sm:px-4 py-3  ${hasPageBackground ? "overflow-auto h-full bg-[rgba(var(--bg-page),var(--bg-page-alpha))] rounded-lg border border-border" : "h-fit "}`}
                >
                  <PostHeader data={document} params={props.params} />
                  <PostContent blocks={blocks} did={did} />
                  <Interactions quotes={document.document_mentions_in_bsky} />
                  <hr className="border-border-light mb-4 mt-4" />
                  {identity &&
                  identity.atp_did ===
                    document.documents_in_publications[0]?.publications
                      .identity_did ? (
                    <a
                      href={`https://leaflet.pub/${document.leaflets_in_publications[0].leaflet}`}
                      className="flex gap-2 items-center hover:!no-underline selected-outline px-2 py-0.5 bg-accent-1 text-accent-2 font-bold w-fit rounded-lg !border-accent-1 !outline-accent-1 mx-auto"
                    >
                      <EditTiny /> Edit Post
                    </a>
                  ) : (
                    <SubscribeWithBluesky
                      isPost
                      base_url={getPublicationURL(
                        document.documents_in_publications[0].publications,
                      )}
                      pub_uri={
                        document.documents_in_publications[0].publications.uri
                      }
                      subscribers={
                        document.documents_in_publications[0].publications
                          .publication_subscriptions
                      }
                      pubName={decodeURIComponent(
                        (await props.params).publication,
                      )}
                    />
                  )}
                </div>
                <InteractionDrawer
                  quotes={document.document_mentions_in_bsky}
                  did={did}
                />
              </div>
              <div
                className="spacer"
                style={{
                  width: `calc(50vw - ((var(--page-width-units)/2 + 13rem))`,
                }}
              />
            </div>
          </div>

          <QuoteHandler />
        </PublicationBackgroundProvider>
      </PublicationThemeProvider>
    </PostPageContextProvider>
  );
}
