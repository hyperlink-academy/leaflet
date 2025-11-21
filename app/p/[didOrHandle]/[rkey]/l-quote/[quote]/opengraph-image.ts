import { getMicroLinkOgImage } from "src/utils/getMicroLinkOgImage";
import { decodeQuotePosition } from "app/lish/[did]/[publication]/[rkey]/quotePosition";

export const runtime = "edge";
export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: { didOrHandle: string; rkey: string; quote: string };
}) {
  let quotePosition = decodeQuotePosition(props.params.quote);
  return getMicroLinkOgImage(
    `/p/${decodeURIComponent(props.params.didOrHandle)}/${props.params.rkey}/l-quote/${props.params.quote}#${quotePosition?.pageId ? `${quotePosition.pageId}~` : ""}${quotePosition?.start.block.join(".")}_${quotePosition?.start.offset}`,
    {
      width: 620,
      height: 324,
      deviceScaleFactor: 2,
    },
  );
}
