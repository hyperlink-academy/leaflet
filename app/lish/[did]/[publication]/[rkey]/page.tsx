import Link from "next/link";
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
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { TextBlock } from "./TextBlock";
import { ThemeProvider } from "components/ThemeManager/ThemeProvider";
import { BlobRef, BskyAgent } from "@atproto/api";
import { SubscribeWithBluesky } from "app/lish/Subscribe";
import { blobRefToSrc } from "src/utils/blobRefToSrc";

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
  let agent = new BskyAgent({ service: "https://public.api.bsky.app" });
  let [{ data: document }, { data: profile }] = await Promise.all([
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
      <div className="flex flex-col px-3 sm:px-4 py-3 sm:py-9 mx-auto w-full bg-[#FDFCFA] h-full min-h-fit">
        <div className="pubHeader flex flex-col pb-5 mx-auto max-w-prose">
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

          <div className="text-sm text-tertiary pt-3 flex gap-1">
            {profile ? (
              <>
                <a
                  className="text-tertiary"
                  href={`https://bsky.app/profile/${profile.handle}`}
                >
                  by {profile.displayName || profile.handle}
                </a>
              </>
            ) : null}
            {record.publishedAt ? (
              <>
                {" "}
                |
                <p>
                  Published{" "}
                  {new Date(record.publishedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "2-digit",
                  })}
                </p>
              </>
            ) : null}
          </div>
        </div>
        <div className="postContent flex flex-col max-w-prose mx-auto">
          {blocks.map((b, index) => {
            return <Block block={b} did={did} key={index} />;
          })}
        </div>
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
    ${isList ? "isListItem pb-0 " : "pb-2 last:pb-3 last:sm:pb-4 first:pt-2 sm:first:pt-3"}
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
    case PubLeafletBlocksWebsite.isMain(b.block): {
      return (
        <a
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
          height={b.block.aspectRatio?.height}
          width={b.block.aspectRatio?.width}
          className={`!pt-3 sm:!pt-4 ${className}`}
          src={blobRefToSrc(b.block.image.ref, did)}
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
          <h1 className={`${className}`}>
            <TextBlock {...b.block} />
          </h1>
        );
      if (b.block.level === 2)
        return (
          <h2 className={`${className}`}>
            <TextBlock {...b.block} />
          </h2>
        );
      if (b.block.level === 3)
        return (
          <h3 className={`${className}`}>
            <TextBlock {...b.block} />
          </h3>
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
