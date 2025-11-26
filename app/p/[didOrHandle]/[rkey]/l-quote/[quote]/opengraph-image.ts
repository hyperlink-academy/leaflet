import { getMicroLinkOgImage } from "src/utils/getMicroLinkOgImage";
import { decodeQuotePosition } from "app/lish/[did]/[publication]/[rkey]/quotePosition";

export const runtime = "edge";
export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: Promise<{ didOrHandle: string; rkey: string; quote: string }>;
}) {
  let params = await props.params;
  let quotePosition = decodeQuotePosition(params.quote);
  return getMicroLinkOgImage(
    `/p/${decodeURIComponent(params.didOrHandle)}/${params.rkey}/l-quote/${params.quote}#${quotePosition?.pageId ? `${quotePosition.pageId}~` : ""}${quotePosition?.start.block.join(".")}_${quotePosition?.start.offset}`,
    {
      width: 620,
      height: 324,
      deviceScaleFactor: 2,
    },
  );
}
