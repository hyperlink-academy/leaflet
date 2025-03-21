import { getPds, IdResolver } from "@atproto/identity";
import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import { ids } from "lexicons/src/lexicons";
import {
  PubLeafletBlocksHeader,
  PubLeafletBlocksImage,
  PubLeafletBlocksText,
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
} from "lexicons/src";
import Link from "next/link";
const idResolver = new IdResolver();
export default async function PublicationPostPage(props: {
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
    <div>
      <Link
        href={`/bsky-test/${props.params.handle}/${props.params.publication}`}
      >
        back
      </Link>
      <h1>{record.title}</h1>
      {blocks.map((b) => {
        switch (true) {
          case PubLeafletBlocksImage.isMain(b.block): {
            return (
              <img
                height={b.block.aspectRatio?.height}
                width={b.block.aspectRatio?.width}
                src={`https://bsky.social/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${(b.block.image.ref as unknown as { $link: string })["$link"]}`}
              />
            );
          }
          case PubLeafletBlocksText.isMain(b.block):
            return <p>{b.block.plaintext}</p>;
          case PubLeafletBlocksHeader.isMain(b.block): {
            if (b.block.level === 1) return <h1>{b.block.plaintext}</h1>;
            if (b.block.level === 2) return <h2>{b.block.plaintext}</h2>;
            if (b.block.level === 3) return <h3>{b.block.plaintext}</h3>;
            if (b.block.level === 4) return <h4>{b.block.plaintext}</h4>;
            if (b.block.level === 5) return <h5>{b.block.plaintext}</h5>;
            return <h6>{b.block.plaintext}</h6>;
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
