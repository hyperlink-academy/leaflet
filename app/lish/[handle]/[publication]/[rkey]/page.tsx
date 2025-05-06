import Link from "next/link";
import { Footer } from "../../../Footer";
import { getPds, IdResolver } from "@atproto/identity";
import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import { ids } from "lexicons/api/lexicons";
import {
  PubLeafletBlocksHeader,
  PubLeafletBlocksImage,
  PubLeafletBlocksText,
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { Metadata } from "next";

const idResolver = new IdResolver();
export async function generateMetadata(props: {
  params: { publication: string; handle: string; rkey: string };
}): Promise<Metadata> {
  let did = await idResolver.handle.resolve(props.params.handle);
  if (!did) return { title: "Publication 404" };

  let { data: document } = await supabaseServerClient
    .from("documents")
    .select("*")
    .eq("uri", AtUri.make(did, ids.PubLeafletDocument, props.params.rkey))
    .single();

  if (!document) return { title: "404" };
  let record = document.data as PubLeafletDocument.Record;
  return {
    title: record.title + " - " + decodeURIComponent(props.params.publication),
  };
}
export default async function Post(props: {
  params: { publication: string; handle: string; rkey: string };
}) {
  let did = await idResolver.handle.resolve(props.params.handle);
  if (!did) return <div> can't resolve handle</div>;
  let { data: document } = await supabaseServerClient
    .from("documents")
    .select("*")
    .eq("uri", AtUri.make(did, ids.PubLeafletDocument, props.params.rkey))
    .single();
  if (!document?.data) return <div>notfound</div>;
  let record = document.data as PubLeafletDocument.Record;
  let firstPage = record.pages[0];
  let blocks: PubLeafletPagesLinearDocument.Block[] = [];
  if (PubLeafletPagesLinearDocument.isMain(firstPage)) {
    blocks = firstPage.blocks || [];
  }
  return (
    <div className="postPage w-full h-screen bg-bg-leaflet flex items-stretch">
      <div className="pubWrapper flex flex-col w-full ">
        <div className="pubContent flex flex-col px-4 py-6 mx-auto max-w-prose h-full w-full overflow-auto">
          <Link
            className="font-bold hover:no-underline text-accent-contrast -mb-2 sm:-mb-3"
            href={`/lish/${props.params.handle}/${props.params.publication}`}
          >
            {decodeURIComponent(props.params.publication)}
          </Link>
          {/* <h1>{record.title}</h1> */}
          {blocks.map((b) => {
            switch (true) {
              case PubLeafletBlocksImage.isMain(b.block): {
                return (
                  <img
                    height={b.block.aspectRatio?.height}
                    width={b.block.aspectRatio?.width}
                    className="pb-2 sm:pb-3"
                    src={`https://bsky.social/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${(b.block.image.ref as unknown as { $link: string })["$link"]}`}
                  />
                );
              }
              case PubLeafletBlocksText.isMain(b.block):
                return <p className="pt-0 pb-2 sm:pb-3">{b.block.plaintext}</p>;
              case PubLeafletBlocksHeader.isMain(b.block): {
                if (b.block.level === 1)
                  return (
                    <h1 className="pb-0 pt-2 sm:pt-3">{b.block.plaintext}</h1>
                  );
                if (b.block.level === 2)
                  return (
                    <h3 className="pb-0 pt-2 sm:pt-3">{b.block.plaintext}</h3>
                  );
                if (b.block.level === 3)
                  return (
                    <h4 className="pb-0 pt-2 sm:pt-3">{b.block.plaintext}</h4>
                  );
                // if (b.block.level === 4) return <h4>{b.block.plaintext}</h4>;
                // if (b.block.level === 5) return <h5>{b.block.plaintext}</h5>;
                return <h6>{b.block.plaintext}</h6>;
              }
              default:
                return null;
            }
          })}
        </div>

        <Footer pageType="post" />
      </div>
    </div>
  );
}
