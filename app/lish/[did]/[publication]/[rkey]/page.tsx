import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import { ids } from "lexicons/api/lexicons";
import {
  PubLeafletBlocksHeader,
  PubLeafletBlocksImage,
  PubLeafletBlocksText,
  PubLeafletBlocksWebsite,
  PubLeafletBlocksUnorderedList,
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { Metadata } from "next";
import { TextBlock } from "./TextBlock";
import { ThemeProvider } from "components/ThemeManager/ThemeProvider";
import { AtpAgent } from "@atproto/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { QuoteHandler } from "./QuoteHandler";
import { SubscribeWithBluesky } from "app/lish/Subscribe";
import { PostHeader } from "./PostHeader/PostHeader";
import { Interactions } from "./Interactions/Interactions";
import { InteractionDrawer } from "./Interactions/InteractionDrawer";

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
  let [{ data: document }] = await Promise.all([
    supabaseServerClient
      .from("documents")
      .select(
        `*,
        documents_in_publications(publications(*, publication_subscriptions(*))),
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
  return (
    <ThemeProvider entityID={null}>
      <div
        id="post-page"
        className="postPage relative w-full overflow-auto h-screen bg-[#FDFCFA] flex items-stretch justify-start sm:justify-center gap-0 sm:gap-4 mx-auto"
      >
        <QuoteHandler />

        <div
          className={`postContent h-fit shrink-0 flex flex-col px-3 sm:px-4 pt-3 pb-6 sm:pt-9 sm:pb-12 sm:w-full w-screen max-w-prose `}
        >
          <PostHeader params={props.params} />
          <div
            id="post-content"
            className="postContent flex flex-col  shrink-0"
          >
            {blocks.map((b, index) => {
              return <Block index={[index]} block={b} did={did} key={index} />;
            })}
          </div>
          <Interactions />
          <hr className="border-border-light my-4" />
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
        <InteractionDrawer />
      </div>
    </ThemeProvider>
  );
}

let Block = ({
  index,
  block,
  did,
  isList,
}: {
  index: number[];
  block: PubLeafletPagesLinearDocument.Block;
  did: string;
  isList?: boolean;
}) => {
  let b = block;
  let blockProps = {
    style: { scrollMarginTop: "10rem", scrollMarginBottom: "10rem" },
    id: index.join("."),
    "data-index": index.join("."),
  };

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
          {b.block.children.map((child, i) => (
            <ListItem
              index={[...index, i]}
              item={child}
              did={did}
              key={i}
              className={className}
            />
          ))}
        </ul>
      );
    }
    case PubLeafletBlocksWebsite.isMain(b.block): {
      return (
        <a
          {...blockProps}
          href={b.block.src}
          target="_blank"
          className={`
          externalLinkBlock flex relative group/linkBlock
          h-[104px] w-full bg-bg-page overflow-hidden text-primary hover:no-underline no-underline
          hover:border-accent-contrast  shadow-sm
          block-border
          `}
        >
          <div className="pt-2 pb-2 px-3 grow min-w-0">
            <div className="flex flex-col w-full min-w-0 h-full grow ">
              <div
                className={`linkBlockTitle bg-transparent -mb-0.5  border-none text-base font-bold outline-none resize-none align-top border h-[24px] line-clamp-1`}
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  wordBreak: "break-all",
                }}
              >
                {b.block.title}
              </div>

              <div
                className={`linkBlockDescription text-sm bg-transparent border-none outline-none resize-none align-top  grow line-clamp-2`}
              >
                {b.block.description}
              </div>
              <div
                style={{ wordBreak: "break-word" }} // better than tailwind break-all!
                className={`min-w-0 w-full line-clamp-1 text-xs italic group-hover/linkBlock:text-accent-contrast text-tertiary`}
              >
                {b.block.src}
              </div>
            </div>
          </div>
          {b.block.previewImage && (
            <div
              className={`linkBlockPreview w-[120px] m-2 -mb-2 bg-cover shrink-0 rounded-t-md border border-border rotate-[4deg] origin-center`}
              style={{
                backgroundImage: `url(${blobRefToSrc(b.block.previewImage?.ref, did)})`,
                backgroundPosition: "center",
              }}
            />
          )}
        </a>
      );
    }
    case PubLeafletBlocksImage.isMain(b.block): {
      return (
        <img
          {...blockProps}
          height={b.block.aspectRatio?.height}
          width={b.block.aspectRatio?.width}
          className={`!mt-3 sm:!mt-4 ${className}`}
          src={blobRefToSrc(b.block.image.ref, did)}
        />
      );
    }
    case PubLeafletBlocksText.isMain(b.block):
      return (
        <div className={` ${className}`} {...blockProps}>
          <TextBlock
            facets={b.block.facets}
            plaintext={b.block.plaintext}
            index={index}
          />
        </div>
      );
    case PubLeafletBlocksHeader.isMain(b.block): {
      if (b.block.level === 1)
        return (
          <h1 className={`${className}`} {...blockProps}>
            <TextBlock {...b.block} index={index} />
          </h1>
        );
      if (b.block.level === 2)
        return (
          <h2 className={`${className}`} {...blockProps}>
            <TextBlock {...b.block} index={index} />
          </h2>
        );
      if (b.block.level === 3)
        return (
          <h3 className={`${className}`} {...blockProps}>
            <TextBlock {...b.block} index={index} />
          </h3>
        );
      // if (b.block.level === 4) return <h4>{b.block.plaintext}</h4>;
      // if (b.block.level === 5) return <h5>{b.block.plaintext}</h5>;
      return (
        <h6 className={`${className}`} {...blockProps}>
          <TextBlock {...b.block} index={index} />
        </h6>
      );
    }
    default:
      return null;
  }
};

function ListItem(props: {
  index: number[];
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
        <Block
          index={props.index}
          block={{ block: props.item.content }}
          did={props.did}
          isList
        />
        {props.item.children?.length ? (
          <ul className="-ml-[7px] sm:ml-[7px]">
            {props.item.children.map((child, index) => (
              <ListItem
                index={[...props.index, index]}
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
