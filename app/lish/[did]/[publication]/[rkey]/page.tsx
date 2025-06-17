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
import { TextBlock } from "./TextBlock";
import { ThemeProvider } from "components/ThemeManager/ThemeProvider";
import { BskyAgent } from "@atproto/api";
import { QuoteHandler } from "./QuoteHandler";
import { SubscribeWithBluesky } from "app/lish/Subscribe";
import { PostHeader } from "./PostHeader";
import {
  InteractionDrawerDesktop,
  InteractionDrawerMobile,
  Interactions,
} from "./Interactions";
import { Media } from "components/Media";

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

  if (!did) return <div> can't resolve handle</div>;
  let agent = new BskyAgent({ service: "https://public.api.bsky.app" });
  let [{ data: document }] = await Promise.all([
    supabaseServerClient
      .from("documents")
      .select(
        "*, documents_in_publications(publications(*, publication_subscriptions(*)))",
      )
      .eq(
        "uri",
        AtUri.make(did, ids.PubLeafletDocument, (await props.params).rkey),
      )
      .single(),
    agent.getProfile({ actor: did }),
  ]);
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
      <div className="postPage relative w-full overflow-x-auto h-screen bg-[#FDFCFA] flex items-stretch justify-start sm:justify-center gap-0 sm:gap-2">
        <div className="postWrapper shrink-0 flex flex-col max-w-prose h-screen">
          <div
            id="post-content"
            className={`relative flex flex-col px-3 sm:px-4 pt-3 pb-6 sm:pt-9 sm:pb-12  h-full sm:w-full w-screen overflow-auto`}
          >
            <QuoteHandler />
            {/* <Quotes /> */}
            <PostHeader params={props.params} />
            <div className="postContent flex flex-col  shrink-0">
              {blocks.map((b, index) => {
                return <Block block={b} did={did} key={index} />;
              })}
            </div>
            <Interactions />
            <hr className="border-border-light mb-4 mt-2" />
            <SubscribeWithBluesky
              isPost
              pub_uri={document.documents_in_publications[0].publications.uri}
              subscribers={
                document.documents_in_publications[0].publications
                  .publication_subscriptions
              }
              pubName={decodeURIComponent((await props.params).publication)}
            />
          </div>
        </div>
        <Media
          mobile={false}
          className="shrink w-96 py-6 h-full max-w-full flex"
        >
          {/* <div className="h-full py-6">
            <div className="border-l border-border-light h-full" />
          </div> */}
          <InteractionDrawerDesktop />
        </Media>
        <Media mobile>
          <InteractionDrawerMobile />
        </Media>
      </div>
    </ThemeProvider>
  );
}

let Block = ({
  block,
  did,
  isList,
}: {
  block: PubLeafletPagesLinearDocument.Block;
  did: string;
  isList?: boolean;
}) => {
  let b = block;

  // non text blocks, they need this padding, pt-3 sm:pt-4, which is applied in each case
  let className = `
    postBlockWrapper
    pt-1
    ${isList ? "isListItem pb-0 " : "mb-2 last:mb-3 last:sm:mb-4 first:mt-2 sm:first:mt-3"}
    ${b.alignment === "lex:pub.leaflet.pages.linearDocument#textAlignRight" ? "text-right" : b.alignment === "lex:pub.leaflet.pages.linearDocument#textAlignCenter" ? "text-center" : ""}
    `;

  switch (true) {
    case PubLeafletBlocksUnorderedList.isMain(b.block): {
      return (
        <ul className="-ml-[1px] sm:ml-[9px] pb-2">
          {b.block.children.map((child, index) => (
            <ListItem
              item={child}
              did={did}
              key={index}
              className={className}
            />
          ))}
        </ul>
      );
    }
    case PubLeafletBlocksImage.isMain(b.block): {
      return (
        <img
          height={b.block.aspectRatio?.height}
          width={b.block.aspectRatio?.width}
          className={`!mt-3 sm:!mt-4 ${className}`}
          src={`/api/atproto_images?did=${did}&cid=${(b.block.image.ref as unknown as { $link: string })["$link"]}`}
        />
      );
    }
    case PubLeafletBlocksText.isMain(b.block):
      return (
        <div className={` ${className}`}>
          <TextBlock facets={b.block.facets} plaintext={b.block.plaintext} />
        </div>
      );
    case PubLeafletBlocksHeader.isMain(b.block): {
      if (b.block.level === 1)
        return (
          <h2 className={`${className}`}>
            <TextBlock {...b.block} />
          </h2>
        );
      if (b.block.level === 2)
        return (
          <h3 className={`${className}`}>
            <TextBlock {...b.block} />
          </h3>
        );
      if (b.block.level === 3)
        return (
          <h4 className={`${className}`}>
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
  className?: string;
}) {
  return (
    <li className={`!pb-0 flex flex-row gap-2`}>
      <div
        className={`listMarker shrink-0 mx-2 z-[1] mt-[14px] h-[5px] w-[5px] rounded-full bg-secondary`}
      />
      <div className="flex flex-col">
        <Block block={{ block: props.item.content }} did={props.did} isList />
        {props.item.children?.length ? (
          <ul className="-ml-[7px] sm:ml-[7px]">
            {props.item.children.map((child, index) => (
              <ListItem
                item={child}
                did={props.did}
                key={index}
                className={props.className}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}
