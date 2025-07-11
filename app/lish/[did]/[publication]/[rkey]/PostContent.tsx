import {
  PubLeafletBlocksHeader,
  PubLeafletBlocksImage,
  PubLeafletBlocksText,
  PubLeafletBlocksUnorderedList,
  PubLeafletBlocksWebsite,
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { TextBlock } from "./TextBlock";
import { Popover } from "components/Popover";
import { theme } from "tailwind.config";
import { ServerSafePopover } from "./ServerSafePopover";
import { ImageAltSmall } from "components/Icons/ImageAlt";

export function PostContent({
  blocks,
  did,
}: {
  blocks: PubLeafletPagesLinearDocument.Block[];
  did: string;
}) {
  return (
    <div className="postContent flex flex-col">
      {blocks.map((b, index) => {
        return <Block block={b} did={did} key={index} />;
      })}
    </div>
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
  let alignment = b.alignment;
  if (!alignment && PubLeafletBlocksImage.isMain(b.block))
    alignment = "lex:pub.leaflet.pages.linearDocument#textAlignCenter";

  // non text blocks, they need this padding, pt-3 sm:pt-4, which is applied in each case
  let className = `
    postBlockWrapper
    pt-1
    ${isList ? "isListItem pb-0 " : "pb-2 last:pb-3 last:sm:pb-4 first:pt-2 sm:first:pt-3"}
    ${alignment === "lex:pub.leaflet.pages.linearDocument#textAlignRight" ? "text-right" : alignment === "lex:pub.leaflet.pages.linearDocument#textAlignCenter" ? "text-center" : ""}
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
        <div className="relative">
          <img
            alt={b.block.alt}
            height={b.block.aspectRatio?.height}
            width={b.block.aspectRatio?.width}
            className={`!pt-3 sm:!pt-4 ${className} rounded-md`}
            src={blobRefToSrc(b.block.image.ref, did)}
          />
          {b.block.alt && (
            <div className="absolute bottom-1.5 right-2 h-max">
              <ServerSafePopover
                className="text-sm max-w-xs  min-w-0"
                side="left"
                trigger={<ImageAltSmall fillColor={theme.colors["bg-page"]} />}
              >
                <div className="text-sm text-secondary w-full">
                  {b.block.alt}
                </div>
              </ServerSafePopover>
            </div>
          )}
        </div>
      );
    }
    case PubLeafletBlocksText.isMain(b.block):
      return (
        <p className={` ${className}`}>
          <TextBlock facets={b.block.facets} plaintext={b.block.plaintext} />
        </p>
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
