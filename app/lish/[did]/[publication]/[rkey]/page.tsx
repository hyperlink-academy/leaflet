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
  let identity = await getIdentityData();
  let [{ data: document }] = await Promise.all([
    supabaseServerClient
      .from("documents")
      .select(
        `*,
        documents_in_publications(publications(*, publication_subscriptions(*))),
        leaflets_in_publications(*),
        document_mentions_in_bsky(*)
        `,
      )
      .eq(
        "uri",
        AtUri.make(did, ids.PubLeafletDocument, (await props.params).rkey),
      )
      .single(),
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

  return (
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
        <QuoteHandler />
        <div
          className={`flex flex-col sm:py-6 h-full   ${hasPageBackground ? "max-w-prose mx-auto sm:px-0 px-[6px] py-2" : "w-full overflow-y-scroll"}`}
        >
          <div
            className={`sm:max-w-prose max-w-[var(--page-width-units)] w-[1000px] mx-auto px-3 sm:px-4 py-3  ${hasPageBackground ? "overflow-auto h-full bg-[rgba(var(--bg-page),var(--bg-page-alpha))] rounded-lg border border-border" : "h-fit "}`}
          >
            <PostHeader params={props.params} />
            <PostContent blocks={blocks} did={did} />
            <Interactions />
            <hr className="border-border-light mb-4 mt-2" />
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
                pub_uri={document.documents_in_publications[0].publications.uri}
                subscribers={
                  document.documents_in_publications[0].publications
                    .publication_subscriptions
                }
                pubName={decodeURIComponent((await props.params).publication)}
              />
            )}
          </div>
          <InteractionDrawer />
        </div>
      </PublicationBackgroundProvider>
    </PublicationThemeProvider>
  );
}
