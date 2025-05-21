import Link from "next/link";
import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import { ids } from "lexicons/api/lexicons";
import {
  PubLeafletBlocksHeader,
  PubLeafletBlocksImage,
  PubLeafletBlocksText,
  PubLeafletBlocksUnorderedList,
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { Metadata } from "next";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { TextBlock } from "./TextBlock";
import { ThemeProvider } from "components/ThemeManager/ThemeProvider";

export async function generateMetadata(props: {
  params: Promise<{ publication: string; did: string; rkey: string }>;
}): Promise<Metadata> {
  let did = decodeURIComponent((await props.params).did);
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
  params: Promise<{ publication: string; did: string; rkey: string }>;
}) {
  let did = decodeURIComponent((await props.params).did);
  if (!did) return <div> can't resolve handle</div>;
  let { data: document } = await supabaseServerClient
    .from("documents")
    .select("*, documents_in_publications(publications(*))")
    .eq(
      "uri",
      AtUri.make(did, ids.PubLeafletDocument, (await props.params).rkey),
    )
    .single();
  if (!document?.data || !document.documents_in_publications[0].publications)
    return <div>notfound</div>;
  let record = document.data as PubLeafletDocument.Record;
  let firstPage = record.pages[0];
  let blocks: PubLeafletPagesLinearDocument.Block[] = [];
  if (PubLeafletPagesLinearDocument.isMain(firstPage)) {
    blocks = firstPage.blocks || [];
  }
  return (
    <ThemeProvider entityID={null}>
      <div className="postPage w-full h-screen bg-[#FDFCFA] flex items-stretch">
        <div className="pubWrapper flex flex-col w-full ">
          <div className="pubContent flex flex-col px-3 sm:px-4 py-3 sm:py-9 mx-auto max-w-prose h-full w-full overflow-auto">
            <div className="flex flex-col pb-8">
              <Link
                className="font-bold hover:no-underline text-accent-contrast"
                href={getPublicationURL(
                  document.documents_in_publications[0].publications,
                )}
              >
                {decodeURIComponent((await props.params).publication)}
              </Link>
              <h2 className="">{record.title}</h2>
              {record.description ? (
                <p className="italic text-secondary">{record.description}</p>
              ) : null}
              {record.publishedAt ? (
                <p className="text-sm text-tertiary pt-3">
                  Published{" "}
                  {new Date(record.publishedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "2-digit",
                  })}
                </p>
              ) : null}
            </div>
            {blocks.map((b, index) => {
              return <Block block={b} did={did} key={index} />;
            })}
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

let Block = ({
  block,
  did,
}: {
  block: PubLeafletPagesLinearDocument.Block;
  did: string;
}) => {
  let b = block;
  let className = `${b.alignment === "lex:pub.leaflet.pages.linearDocument#textAlignRight" ? "text-right" : b.alignment === "lex:pub.leaflet.pages.linearDocument#textAlignCenter" ? "text-center" : ""}`;
  console.log(b.alignment);
  switch (true) {
    case PubLeafletBlocksUnorderedList.isMain(b.block): {
      return (
        <ul>
          {b.block.children.map((child, index) => (
            <ListItem item={child} did={did} key={index} />
          ))}
        </ul>
      );
    }
    case PubLeafletBlocksImage.isMain(b.block): {
      return (
        <img
          height={b.block.aspectRatio?.height}
          width={b.block.aspectRatio?.width}
          className={`pb-2 sm:pb-3 ${className}`}
          src={`https://bsky.social/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${(b.block.image.ref as unknown as { $link: string })["$link"]}`}
        />
      );
    }
    case PubLeafletBlocksText.isMain(b.block):
      return (
        <div className={`pt-0 pb-2 sm:pb-3 ${className}`}>
          <TextBlock facets={b.block.facets} plaintext={b.block.plaintext} />
        </div>
      );
    case PubLeafletBlocksHeader.isMain(b.block): {
      if (b.block.level === 1)
        return (
          <h1 className={`pb-0 pt-2 sm:pt-3 ${className}`}>
            <TextBlock {...b.block} />
          </h1>
        );
      if (b.block.level === 2)
        return (
          <h3 className={`pb-0 pt-2 sm:pt-3 ${className}`}>
            <TextBlock {...b.block} />
          </h3>
        );
      if (b.block.level === 3)
        return (
          <h4 className={`pb-0 pt-2 sm:pt-3 ${className}`}>
            <TextBlock {...b.block} />
          </h4>
        );
      // if (b.block.level === 4) return <h4>{b.block.plaintext}</h4>;
      // if (b.block.level === 5) return <h5>{b.block.plaintext}</h5>;
      return (
        <h6 className={`${className}`}>
          <TextBlock {...b.block} />
        </h6>
      );
    }
    default:
      return null;
  }
};

function ListItem(props: {
  item: PubLeafletBlocksUnorderedList.ListItem;
  did: string;
}) {
  return (
    <li>
      <Block block={{ block: props.item.content }} did={props.did} />
      {props.item.children?.length ? (
        <ul>
          {props.item.children.map((child, index) => (
            <ListItem item={child} did={props.did} key={index} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
