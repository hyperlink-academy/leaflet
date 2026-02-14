"use client";
import {
  PubLeafletBlocksMath,
  PubLeafletBlocksCode,
  PubLeafletBlocksHeader,
  PubLeafletBlocksImage,
  PubLeafletBlocksText,
  PubLeafletBlocksUnorderedList,
  PubLeafletBlocksOrderedList,
  PubLeafletBlocksWebsite,
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
  PubLeafletPagesCanvas,
  PubLeafletBlocksHorizontalRule,
  PubLeafletBlocksBlockquote,
  PubLeafletBlocksBskyPost,
  PubLeafletBlocksIframe,
  PubLeafletBlocksPage,
  PubLeafletBlocksPoll,
  PubLeafletBlocksButton,
} from "lexicons/api";

import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { TextBlock } from "./Blocks/TextBlock";
import { Popover } from "components/Popover";
import { theme } from "tailwind.config";
import { ImageAltSmall } from "components/Icons/ImageAlt";
import { StaticMathBlock } from "./Blocks/StaticMathBlock";
import { PubCodeBlock } from "./Blocks/PubCodeBlock";
import { AppBskyFeedDefs } from "@atproto/api";
import { PubBlueskyPostBlock } from "./Blocks/PublishBskyPostBlock";
import { PublishedPageLinkBlock } from "./Blocks/PublishedPageBlock";
import { PublishedPollBlock } from "./Blocks/PublishedPollBlock";
import { PollData } from "./fetchPollData";
import { ButtonPrimary } from "components/Buttons";
import { PostNotAvailable } from "components/Blocks/BlueskyPostBlock/BlueskyEmbed";

export function PostContent({
  blocks,
  did,
  preview,
  className,
  prerenderedCodeBlocks,
  bskyPostData,
  pageId,
  pages,
  pollData,
}: {
  blocks: PubLeafletPagesLinearDocument.Block[];
  pageId?: string;
  did: string;
  preview?: boolean;
  className?: string;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
  pollData: PollData[];
  pages: (PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main)[];
}) {
  return (
    <div
      //The postContent class is important for QuoteHandler
      className={`postContent flex flex-col sm:px-4 px-3 sm:pt-3 pt-2 pb-1 sm:pb-4 ${className}`}
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
            pollData={pollData}
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
  pollData,
}: {
  pageId?: string;
  preview?: boolean;
  index: number[];
  block: PubLeafletPagesLinearDocument.Block;
  did: string;
  isList?: boolean;
  pages: (PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main)[];
  previousBlock?: PubLeafletPagesLinearDocument.Block;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
  pollData: PollData[];
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
          : b.alignment === "lex:pub.leaflet.pages.linearDocument#textAlignLeft"
            ? "text-left justify-start"
            : undefined;
  if (
    !alignment &&
    (PubLeafletBlocksImage.isMain(b.block) ||
      PubLeafletBlocksButton.isMain(b.block))
  )
    alignment = "text-center justify-center";

  let className = `
    postBlockWrapper
    min-h-7
    mt-1 mb-2
    ${isList && "isListItem mb-0! "}
    ${alignment}
    `;

  switch (true) {
    case PubLeafletBlocksPage.isMain(b.block): {
      let id = b.block.id;
      let page = pages.find((p) => p.id === id);
      if (!page) return;

      const isCanvas = PubLeafletPagesCanvas.isMain(page);

      return (
        <PublishedPageLinkBlock
          blocks={page.blocks}
          pageId={id}
          parentPageId={pageId}
          did={did}
          bskyPostData={bskyPostData}
          isCanvas={isCanvas}
          pages={pages}
          className={className}
        />
      );
    }
    case PubLeafletBlocksBskyPost.isMain(b.block): {
      let uri = b.block.postRef.uri;
      let post = bskyPostData.find((p) => p.uri === uri);
      if (!post) return <PostNotAvailable />;
      return (
        <PubBlueskyPostBlock
          post={post}
          className={className}
          pageId={pageId}
        />
      );
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
    case PubLeafletBlocksPoll.isMain(b.block): {
      let { cid, uri } = b.block.pollRef;
      const pollVoteData = pollData.find((p) => p.uri === uri && p.cid === cid);
      if (!pollVoteData) return null;
      return (
        <PublishedPollBlock
          block={b.block}
          className={className}
          pollData={pollVoteData}
        />
      );
    }
    case PubLeafletBlocksButton.isMain(b.block): {
      return (
        <div className={`flex ${alignment} ${className}`} {...blockProps}>
          <a href={b.block.url} target="_blank" rel="noopener noreferrer">
            <ButtonPrimary role="link" type="submit">
              {b.block.text}
            </ButtonPrimary>
          </a>
        </div>
      );
    }
    case PubLeafletBlocksUnorderedList.isMain(b.block): {
      return (
        <ul className="-ml-px sm:ml-[9px] pb-2">
          {b.block.children.map((child, i) => (
            <ListItem
              pollData={pollData}
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
    case PubLeafletBlocksOrderedList.isMain(b.block): {
      return (
        <ol className="-ml-px sm:ml-[9px] pb-2" start={b.block.startIndex || 1}>
          {b.block.children.map((child, i) => (
            <OrderedListItem
              pollData={pollData}
              pages={pages}
              bskyPostData={bskyPostData}
              index={[...index, i]}
              item={child}
              did={did}
              key={i}
              className={className}
              pageId={pageId}
              startIndex={b.block.startIndex || 1}
            />
          ))}
        </ol>
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
          ${className}
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
        <div
          className={`imageBlock relative flex ${alignment}`}
          {...blockProps}
        >
          <img
            alt={b.block.alt}
            height={b.block.aspectRatio?.height}
            width={b.block.aspectRatio?.width}
            className={`rounded-lg border border-transparent ${className}`}
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
        // all this margin stuff is a highly unfortunate hack so that the border-l on blockquote is the height of just the text rather than the height of the block, which includes padding.
        <blockquote
          className={`blockquote py-0! mb-2! ${className} ${PubLeafletBlocksBlockquote.isMain(previousBlock?.block) ? "-mt-2! pt-3!" : "mt-1!"}`}
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
        <p
          className={`textBlock ${className} ${b.block.textSize === "small" ? "text-sm text-secondary" : b.block.textSize === "large" ? "text-lg" : ""}`}
          {...blockProps}
        >
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
          <h2 className={`h1Block ${className}`} {...blockProps}>
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
          <h3 className={`h2Block ${className}`} {...blockProps}>
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
          <h4 className={`h3Block ${className}`} {...blockProps}>
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
        <h6 className={`h6Block ${className}`} {...blockProps}>
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
  pages: (PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main)[];
  item: PubLeafletBlocksUnorderedList.ListItem;
  did: string;
  className?: string;
  bskyPostData: AppBskyFeedDefs.PostView[];
  pollData: PollData[];
  pageId?: string;
}) {
  let children = props.item.children?.length ? (
    <ul className="-ml-[7px] sm:ml-[7px]">
      {props.item.children.map((child, index) => (
        <ListItem
          pages={props.pages}
          pollData={props.pollData}
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
          pollData={props.pollData}
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

function OrderedListItem(props: {
  index: number[];
  pages: (PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main)[];
  item: PubLeafletBlocksOrderedList.ListItem;
  did: string;
  className?: string;
  bskyPostData: AppBskyFeedDefs.PostView[];
  pollData: PollData[];
  pageId?: string;
  startIndex?: number;
}) {
  const calculatedIndex = (props.startIndex || 1) + props.index[props.index.length - 1];
  let children = props.item.children?.length ? (
    <ol className="-ml-[7px] sm:ml-[7px]">
      {props.item.children.map((child, index) => (
        <OrderedListItem
          pages={props.pages}
          pollData={props.pollData}
          bskyPostData={props.bskyPostData}
          index={[...props.index, index]}
          item={child}
          did={props.did}
          key={index}
          className={props.className}
          pageId={props.pageId}
          startIndex={props.startIndex}
        />
      ))}
    </ol>
  ) : null;
  return (
    <li className={`pb-0! flex flex-row gap-2`}>
      <div className="listMarker shrink-0 mx-2 z-1 mt-[14px]">
        {calculatedIndex}.
      </div>
      <div className="flex flex-col w-full">
        <Block
          pollData={props.pollData}
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
