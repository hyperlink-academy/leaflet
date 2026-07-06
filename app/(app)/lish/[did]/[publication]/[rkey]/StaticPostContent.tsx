import {
  PubLeafletBlocksBlockquote,
  PubLeafletBlocksCode,
  PubLeafletBlocksHeader,
  PubLeafletBlocksHorizontalRule,
  PubLeafletBlocksImage,
  PubLeafletBlocksImageGallery,
  PubLeafletBlocksMath,
  PubLeafletBlocksText,
  PubLeafletBlocksUnorderedList,
  PubLeafletBlocksWebsite,
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { CheckboxChecked } from "components/Icons/CheckboxChecked";
import { CheckboxEmpty } from "components/Icons/CheckboxEmpty";
import { blockTextSize } from "src/utils/blockTextSize";
import { TextBlockCore, TextBlockCoreProps } from "./Blocks/TextBlockCore";
import { StaticMathBlock } from "./Blocks/StaticMathBlock";
import { codeToHtml, bundledLanguagesInfo, bundledThemesInfo } from "shiki";

function StaticBaseTextBlock(props: Omit<TextBlockCoreProps, "renderers">) {
  return <TextBlockCore {...props} />;
}

export function StaticPostContent({
  blocks,
  did,
  baseUrl,
}: {
  blocks: PubLeafletPagesLinearDocument.Block[];
  did: string;
  // Absolute origin for blob image URLs — feed contexts have no document
  // origin to resolve relative /api/atproto_images paths against.
  baseUrl?: string;
}) {
  return (
    <div className="postContent footnote-scope flex flex-col">
      {blocks.map((b, index) => {
        return <Block block={b} did={did} baseUrl={baseUrl} key={index} />;
      })}
    </div>
  );
}

let Block = async ({
  block,
  did,
  baseUrl,
  isList,
}: {
  block: PubLeafletPagesLinearDocument.Block;
  did: string;
  baseUrl?: string;
  isList?: boolean;
}) => {
  let b = block;

  switch (true) {
    case PubLeafletBlocksBlockquote.isMain(b.block): {
      return (
        <blockquote className={` blockquote `}>
          <StaticBaseTextBlock
            facets={b.block.facets}
            plaintext={b.block.plaintext}
            index={[]}
          />
        </blockquote>
      );
    }
    case PubLeafletBlocksHorizontalRule.isMain(b.block): {
      return <hr className="my-2 w-full border-border-light" />;
    }
    case PubLeafletBlocksMath.isMain(b.block): {
      return <StaticMathBlock block={b.block} />;
    }
    case PubLeafletBlocksCode.isMain(b.block): {
      let { language, syntaxHighlightingTheme } = b.block;
      const lang =
        bundledLanguagesInfo.find((l) => l.id === language)?.id || "plaintext";
      const theme =
        bundledThemesInfo.find((t) => t.id === syntaxHighlightingTheme)?.id ||
        "github-light";

      let html = await codeToHtml(b.block.plaintext, { lang, theme });
      return (
        <div
          className="w-full min-h-[42px] rounded-md border-border-light outline-border-light selected-outline"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    case PubLeafletBlocksUnorderedList.isMain(b.block): {
      return (
        <ul>
          {b.block.children.map((child, index) => (
            <ListItem item={child} did={did} baseUrl={baseUrl} key={index} />
          ))}
        </ul>
      );
    }
    case PubLeafletBlocksWebsite.isMain(b.block): {
      return (
        <a href={b.block.src} target="_blank">
          <h3>{b.block.title}</h3>
          <p>{b.block.description}</p>
          {b.block.previewImage && (
            <div
              className={`imagePreview w-[120px] m-2 -mb-2 bg-cover shrink-0 rounded-t-md border border-border rotate-[4deg] origin-center relative`}
              style={{
                backgroundImage: `url(${blobRefToSrc(b.block.previewImage?.ref, did, baseUrl)})`,
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
          alt={b.block.alt}
          height={b.block.aspectRatio?.height}
          width={b.block.aspectRatio?.width}
          src={blobRefToSrc(b.block.image.ref, did, baseUrl)}
        />
      );
    }
    case PubLeafletBlocksImageGallery.isMain(b.block): {
      // Feeds/email render statically: no interactivity, just a stack of the
      // gallery's images.
      return (
        <div
          className="flex flex-col w-full"
          style={{ gap: `${b.block.gap ?? 8}px` }}
        >
          {b.block.images.map((image, index) => (
            <img
              key={index}
              alt={image.alt}
              height={image.aspectRatio.height}
              width={image.aspectRatio.width}
              src={blobRefToSrc(image.image.ref, did, baseUrl)}
            />
          ))}
        </div>
      );
    }
    case PubLeafletBlocksText.isMain(b.block):
      return (
        <p style={{ fontSize: blockTextSize.p }}>
          <StaticBaseTextBlock
            facets={b.block.facets}
            plaintext={b.block.plaintext}
            index={[]}
          />
        </p>
      );
    case PubLeafletBlocksHeader.isMain(b.block): {
      if (b.block.level === 1)
        return (
          <h1 style={{ fontSize: blockTextSize.h1 }}>
            <StaticBaseTextBlock {...b.block} index={[]} />
          </h1>
        );
      if (b.block.level === 2)
        return (
          <h2 style={{ fontSize: blockTextSize.h2 }}>
            <StaticBaseTextBlock {...b.block} index={[]} />
          </h2>
        );
      if (b.block.level === 3)
        return (
          <h3 style={{ fontSize: blockTextSize.h3 }}>
            <StaticBaseTextBlock {...b.block} index={[]} />
          </h3>
        );
      // if (b.block.level === 4) return <h4>{b.block.plaintext}</h4>;
      // if (b.block.level === 5) return <h5>{b.block.plaintext}</h5>;
      return (
        <h6 style={{ fontSize: blockTextSize.h4 }}>
          <StaticBaseTextBlock {...b.block} index={[]} />
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
  baseUrl?: string;
  className?: string;
}) {
  let isChecklist = props.item.checked !== undefined;
  return (
    <li className={`pb-0! flex flex-row gap-2`}>
      <div
        className={`listMarker shrink-0 mx-2 z-1 mt-[14px] h-[5px] w-[5px] rounded-full bg-secondary`}
      />
      {isChecklist && (
        <div className={`pr-2 ${props.item.checked ? "text-accent-contrast" : "text-border"}`}>
          {props.item.checked ? <CheckboxChecked /> : <CheckboxEmpty />}
        </div>
      )}
      <div className="flex flex-col">
        <Block
          block={{ block: props.item.content }}
          did={props.did}
          baseUrl={props.baseUrl}
          isList
        />
        {props.item.children?.length ? (
          <ul className="-ml-[7px] sm:ml-[7px]">
            {props.item.children.map((child, index) => (
              <ListItem
                item={child}
                did={props.did}
                baseUrl={props.baseUrl}
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
