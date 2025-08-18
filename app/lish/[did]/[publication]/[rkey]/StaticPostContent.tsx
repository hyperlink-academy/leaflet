import {
  PubLeafletBlocksBlockquote,
  PubLeafletBlocksCode,
  PubLeafletBlocksHeader,
  PubLeafletBlocksHorizontalRule,
  PubLeafletBlocksImage,
  PubLeafletBlocksMath,
  PubLeafletBlocksText,
  PubLeafletBlocksUnorderedList,
  PubLeafletBlocksWebsite,
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { BaseTextBlock } from "./BaseTextBlock";
import { StaticMathBlock } from "./StaticMathBlock";
import { codeToHtml } from "shiki";

export function StaticPostContent({
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

let Block = async ({
  block,
  did,
  isList,
}: {
  block: PubLeafletPagesLinearDocument.Block;
  did: string;
  isList?: boolean;
}) => {
  let b = block;

  switch (true) {
    case PubLeafletBlocksBlockquote.isMain(b.block): {
      return (
        <blockquote className={`border-l-2 border-border pl-2`}>
          <BaseTextBlock
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
      let html = await codeToHtml(b.block.plaintext, {
        lang: b.block.language || "plaintext",
        theme: b.block.syntaxHighlightingTheme || "github-light",
      });
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
            <ListItem item={child} did={did} key={index} />
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
          alt={b.block.alt}
          height={b.block.aspectRatio?.height}
          width={b.block.aspectRatio?.width}
          src={blobRefToSrc(b.block.image.ref, did)}
        />
      );
    }
    case PubLeafletBlocksText.isMain(b.block):
      return (
        <p>
          <BaseTextBlock
            facets={b.block.facets}
            plaintext={b.block.plaintext}
            index={[]}
          />
        </p>
      );
    case PubLeafletBlocksHeader.isMain(b.block): {
      if (b.block.level === 1)
        return (
          <h1>
            <BaseTextBlock {...b.block} index={[]} />
          </h1>
        );
      if (b.block.level === 2)
        return (
          <h2>
            <BaseTextBlock {...b.block} index={[]} />
          </h2>
        );
      if (b.block.level === 3)
        return (
          <h3>
            <BaseTextBlock {...b.block} index={[]} />
          </h3>
        );
      // if (b.block.level === 4) return <h4>{b.block.plaintext}</h4>;
      // if (b.block.level === 5) return <h5>{b.block.plaintext}</h5>;
      return (
        <h6>
          <BaseTextBlock {...b.block} index={[]} />
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
