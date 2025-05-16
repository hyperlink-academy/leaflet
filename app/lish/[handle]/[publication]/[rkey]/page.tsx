import Link from "next/link";
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
  params: Promise<{ publication: string; handle: string; rkey: string }>;
}): Promise<Metadata> {
  let did = await idResolver.handle.resolve((await props.params).handle);
  if (!did) return { title: "Publication 404" };

  let { data: document } = await supabaseServerClient
    .from("documents")
    .select("*")
    .eq(
      "uri",
      AtUri.make(did, ids.PubLeafletDocument, (await props.params).rkey),
    )
    .single();

  if (!document) return { title: "404" };
  let record = document.data as PubLeafletDocument.Record;
  return {
    title:
      record.title +
      " - " +
      decodeURIComponent((await props.params).publication),
  };
}
export default async function Post(props: {
  params: Promise<{ publication: string; handle: string; rkey: string }>;
}) {
  let did = await idResolver.handle.resolve((await props.params).handle);
  if (!did) return <div> can't resolve handle</div>;
  let { data: document } = await supabaseServerClient
    .from("documents")
    .select("*")
    .eq(
      "uri",
      AtUri.make(did, ids.PubLeafletDocument, (await props.params).rkey),
    )
    .single();
  if (!document?.data) return <div>notfound</div>;
  let record = document.data as PubLeafletDocument.Record;
  let firstPage = record.pages[0];
  let blocks: PubLeafletPagesLinearDocument.Block[] = [];
  if (PubLeafletPagesLinearDocument.isMain(firstPage)) {
    blocks = firstPage.blocks || [];
  }
  return (
    <div className="postPage w-full h-screen bg-[#FDFCFA] flex items-stretch">
      <div className="pubWrapper flex flex-col w-full ">
        <div className="pubContent flex flex-col px-3 sm:px-4 py-3 sm:py-9 mx-auto max-w-prose h-full w-full overflow-auto">
          <div className="flex flex-col pb-8">
            <Link
              className="font-bold hover:no-underline text-accent-contrast"
              href={`/lish/${(await props.params).handle}/${(await props.params).publication}`}
            >
              {decodeURIComponent((await props.params).publication)}
            </Link>
            <h2 className="">{record.title}</h2>
            <p className="italic text-secondary">
              This is a placeholder description and I want it to be longer so it
              spans two lines.
            </p>
            <p className="text-sm text-tertiary pt-3">Published 06/02/2025</p>
          </div>
          {blocks.map((b, index) => {
            switch (true) {
              case PubLeafletBlocksImage.isMain(b.block): {
                return (
                  <img
                    key={index}
                    height={b.block.aspectRatio?.height}
                    width={b.block.aspectRatio?.width}
                    className="pb-2 sm:pb-3"
                    src={`https://bsky.social/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${(b.block.image.ref as unknown as { $link: string })["$link"]}`}
                  />
                );
              }
              case PubLeafletBlocksText.isMain(b.block):
                return (
                  <p key={index} className="pt-0 pb-2 sm:pb-3">
                    {b.block.plaintext}
                  </p>
                );
              case PubLeafletBlocksHeader.isMain(b.block): {
                if (b.block.level === 1)
                  return (
                    <h1 key={index} className="pb-0 pt-2 sm:pt-3">
                      {b.block.plaintext}
                    </h1>
                  );
                if (b.block.level === 2)
                  return (
                    <h3 key={index} className="pb-0 pt-2 sm:pt-3">
                      {b.block.plaintext}
                    </h3>
                  );
                if (b.block.level === 3)
                  return (
                    <h4 key={index} className="pb-0 pt-2 sm:pt-3">
                      {b.block.plaintext}
                    </h4>
                  );
                // if (b.block.level === 4) return <h4>{b.block.plaintext}</h4>;
                // if (b.block.level === 5) return <h5>{b.block.plaintext}</h5>;
                return <h6 key={index}>{b.block.plaintext}</h6>;
              }
              default:
                return null;
            }
          })}
        </div>
      </div>
    </div>
  );
}
