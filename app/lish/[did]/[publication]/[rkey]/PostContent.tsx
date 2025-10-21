"use client";
import {
  PubLeafletBlocksMath,
  PubLeafletBlocksCode,
  PubLeafletBlocksHeader,
  PubLeafletBlocksImage,
  PubLeafletBlocksText,
  PubLeafletBlocksUnorderedList,
  PubLeafletBlocksWebsite,
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
  PubLeafletBlocksHorizontalRule,
  PubLeafletBlocksBlockquote,
  PubLeafletBlocksBskyPost,
  PubLeafletBlocksIframe,
  PubLeafletBlocksPage,
} from "lexicons/api";

import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { TextBlock } from "./TextBlock";
import { Popover } from "components/Popover";
import { theme } from "tailwind.config";
import { ImageAltSmall } from "components/Icons/ImageAlt";
import { StaticMathBlock } from "./StaticMathBlock";
import { PubCodeBlock } from "./PubCodeBlock";
import { AppBskyFeedDefs } from "@atproto/api";
import { PubBlueskyPostBlock } from "./PublishBskyPostBlock";
import { openPage } from "./PostPages";
import { PageLinkBlock } from "components/Blocks/PageLinkBlock";
import { PublishedPageLinkBlock } from "./PublishedPageBlock";

export function PostContent({
  blocks,
  did,
  preview,
  className,
  prerenderedCodeBlocks,
  bskyPostData,
  pageId,
  pages,
}: {
  blocks: PubLeafletPagesLinearDocument.Block[];
  pageId?: string;
  did: string;
  preview?: boolean;
  className?: string;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
  pages: PubLeafletPagesLinearDocument.Main[];
}) {
  return (
    <div
      //The postContent class is important for QuoteHandler
      className={`postContent flex flex-col sm:px-4 px-3 sm:pt-3 pt-2 pb-1 sm:pb-2 ${className}`}
    >
      {blocks.map((b, index) => {
        return (
          <Block
            pageId={pageId}
            pages={pages}
            bskyPostData={bskyPostData}
            block={b}
            did={did}
            key={index}
            previousBlock={blocks[index - 1]}
            index={[index]}
            preview={preview}
            prerenderedCodeBlocks={prerenderedCodeBlocks}
          />
        );
      })}
    </div>
  );
}

export let Block = ({
  block,
  did,
  isList,
  index,
  preview,
  previousBlock,
  prerenderedCodeBlocks,
  bskyPostData,
  pageId,
  pages,
}: {
  pageId?: string;
  preview?: boolean;
  index: number[];
  block: PubLeafletPagesLinearDocument.Block;
  did: string;
  isList?: boolean;
  pages: PubLeafletPagesLinearDocument.Main[];
  previousBlock?: PubLeafletPagesLinearDocument.Block;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
}) => {
  let b = block;
  let blockProps = {
    style: {
      scrollMarginTop: "4rem",
      scrollMarginBottom: "4rem",
      wordBreak: "break-word" as React.CSSProperties["wordBreak"],
    },
    id: preview
      ? undefined
      : pageId
        ? `${pageId}~${index.join(".")}`
        : index.join("."),
    "data-index": index.join("."),
    "data-page-id": pageId,
  };
  let alignment =
    b.alignment === "lex:pub.leaflet.pages.linearDocument#textAlignRight"
      ? "text-right justify-end"
      : b.alignment === "lex:pub.leaflet.pages.linearDocument#textAlignCenter"
        ? "text-center justify-center"
        : b.alignment ===
            "lex:pub.leaflet.pages.linearDocument#textAlignJustify"
          ? "text-justify justify-start"
          : "";
  if (!alignment && PubLeafletBlocksImage.isMain(b.block))
    alignment = "text-center justify-center";

  // non text blocks, they need this padding, pt-3 sm:pt-4, which is applied in each case
  let className = `
    postBlockWrapper
    min-h-7
    pt-1 pb-2
    ${isList && "isListItem pb-0! "}
    ${alignment}
    `;

  switch (true) {
    case PubLeafletBlocksPage.isMain(b.block): {
      let id = b.block.id;
      let page = pages.find((p) => p.id === id);
      if (!page) return;
      return (
        <PublishedPageLinkBlock
          blocks={page.blocks}
          pageId={id}
          parentPageId={pageId}
          did={did}
          bskyPostData={bskyPostData}
        />
      );
    }
    case PubLeafletBlocksBskyPost.isMain(b.block): {
      let uri = b.block.postRef.uri;
      let post = bskyPostData.find((p) => p.uri === uri);
      if (!post) return <div>no prefetched post rip</div>;
      return <PubBlueskyPostBlock post={post} />;
    }
    case PubLeafletBlocksIframe.isMain(b.block): {
      return (
        <iframe
          className={`flex flex-col relative w-full overflow-hidden group/embedBlock block-border my-2`}
          width="100%"
          height={b.block.height}
          src={b.block.url}
          allow="fullscreen"
          loading="lazy"
        />
      );
    }
    case PubLeafletBlocksHorizontalRule.isMain(b.block): {
      return <hr className="my-2 w-full border-border-light" />;
    }
    case PubLeafletBlocksUnorderedList.isMain(b.block): {
      return (
        <ul className="-ml-px sm:ml-[9px] pb-2">
          {b.block.children.map((child, i) => (
            <ListItem
              pages={pages}
              bskyPostData={bskyPostData}
              index={[...index, i]}
              item={child}
              did={did}
              key={i}
              className={className}
              pageId={pageId}
            />
          ))}
        </ul>
      );
    }
    case PubLeafletBlocksMath.isMain(b.block): {
      return <StaticMathBlock block={b.block} />;
    }
    case PubLeafletBlocksCode.isMain(b.block): {
      let html = prerenderedCodeBlocks?.get(index.join("."));
      return <PubCodeBlock block={b.block} prerenderedCode={html} />;
    }
    case PubLeafletBlocksWebsite.isMain(b.block): {
      return (
        <a
          {...blockProps}
          href={b.block.src}
          target="_blank"
          className={`
            my-2
          externalLinkBlock flex relative group/linkBlock
          h-[104px] w-full bg-bg-page overflow-hidden text-primary hover:no-underline no-underline
          hover:border-accent-contrast  shadow-sm
          block-border
          `}
        >
          <div className="pt-2 pb-2 px-3 grow min-w-0">
            <div className="flex flex-col w-full min-w-0 h-full grow ">
              <div
                className={`linkBlockTitle bg-transparent -mb-0.5  border-none text-base font-bold outline-hidden resize-none align-top border h-[24px] line-clamp-1`}
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  wordBreak: "break-all",
                }}
              >
                {b.block.title}
              </div>

              <div
                className={`linkBlockDescription text-sm bg-transparent border-none outline-hidden resize-none align-top  grow line-clamp-2`}
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
              className={`imagePreview w-[120px] m-2 -mb-2 bg-cover shrink-0 rounded-t-md border border-border rotate-[4deg] origin-center relative`}
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
        <div className={`relative flex ${alignment}`} {...blockProps}>
          <img
            alt={b.block.alt}
            height={b.block.aspectRatio?.height}
            width={b.block.aspectRatio?.width}
            className={`pt-3! sm:pt-4! rounded-md ${className}`}
            src={blobRefToSrc(b.block.image.ref, did)}
          />
          {b.block.alt && (
            <div className="absolute bottom-1.5 right-2 h-max">
              <Popover
                className="text-sm max-w-xs  min-w-0"
                side="left"
                trigger={<ImageAltSmall fillColor={theme.colors["bg-page"]} />}
              >
                <div className="text-sm text-secondary w-full">
                  {b.block.alt}
                </div>
              </Popover>
            </div>
          )}
        </div>
      );
    }
    case PubLeafletBlocksBlockquote.isMain(b.block): {
      return (
        // highly unfortunate hack so that the border-l on blockquote is the height of just the text rather than the height of the block, which includes padding.
        <blockquote
          className={` blockquote py-0! mb-2! last:mb-3! sm:last:mb-4! first:mt-2! sm:first:pt-3 ${className} ${PubLeafletBlocksBlockquote.isMain(previousBlock?.block) ? "-mt-2!" : "mt-1!"}`}
          {...blockProps}
        >
          <TextBlock
            facets={b.block.facets}
            plaintext={b.block.plaintext}
            index={index}
            preview={preview}
            pageId={pageId}
          />
        </blockquote>
      );
    }
    case PubLeafletBlocksText.isMain(b.block):
      return (
        <p className={` ${className}`} {...blockProps}>
          <TextBlock
            facets={b.block.facets}
            plaintext={b.block.plaintext}
            index={index}
            preview={preview}
            pageId={pageId}
          />
        </p>
      );
    case PubLeafletBlocksHeader.isMain(b.block): {
      if (b.block.level === 1)
        return (
          <h2 className={`${className}`} {...blockProps}>
            <TextBlock
              {...b.block}
              index={index}
              preview={preview}
              pageId={pageId}
            />
          </h2>
        );
      if (b.block.level === 2)
        return (
          <h3 className={`${className}`} {...blockProps}>
            <TextBlock
              {...b.block}
              index={index}
              preview={preview}
              pageId={pageId}
            />
          </h3>
        );
      if (b.block.level === 3)
        return (
          <h4 className={`${className}`} {...blockProps}>
            <TextBlock
              {...b.block}
              index={index}
              preview={preview}
              pageId={pageId}
            />
          </h4>
        );
      // if (b.block.level === 4) return <h4>{b.block.plaintext}</h4>;
      // if (b.block.level === 5) return <h5>{b.block.plaintext}</h5>;
      return (
        <h6 className={`${className}`} {...blockProps}>
          <TextBlock
            {...b.block}
            index={index}
            preview={preview}
            pageId={pageId}
          />
        </h6>
      );
    }
    default:
      return null;
  }
};

function ListItem(props: {
  index: number[];
  pages: PubLeafletPagesLinearDocument.Main[];
  item: PubLeafletBlocksUnorderedList.ListItem;
  did: string;
  className?: string;
  bskyPostData: AppBskyFeedDefs.PostView[];
  pageId?: string;
}) {
  let children = props.item.children?.length ? (
    <ul className="-ml-[7px] sm:ml-[7px]">
      {props.item.children.map((child, index) => (
        <ListItem
          pages={props.pages}
          bskyPostData={props.bskyPostData}
          index={[...props.index, index]}
          item={child}
          did={props.did}
          key={index}
          className={props.className}
          pageId={props.pageId}
        />
      ))}
    </ul>
  ) : null;

  return (
    <li className={`pb-0! flex flex-row gap-2`}>
      <div
        className={`listMarker shrink-0 mx-2 z-1 mt-[14px] h-[5px] w-[5px] ${props.item.content?.$type !== "null" ? "rounded-full bg-secondary" : ""}`}
      />
      <div className="flex flex-col w-full">
        <Block
          pages={props.pages}
          bskyPostData={props.bskyPostData}
          block={{ block: props.item.content }}
          did={props.did}
          isList
          index={props.index}
          pageId={props.pageId}
        />
        {children}{" "}
      </div>
    </li>
  );
}
