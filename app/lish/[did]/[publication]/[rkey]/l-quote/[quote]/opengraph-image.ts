import { getMicroLinkOgImage } from "src/utils/getMicroLinkOgImage";
import { decodeQuotePosition } from "../../quotePosition";

export const runtime = "edge";
export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: Promise<{ publication: string; did: string; rkey: string; quote: string }>;
}) {
  let params = await props.params;
  let quotePosition = decodeQuotePosition(params.quote);
  return getMicroLinkOgImage(
    `/lish/${decodeURIComponent(params.did)}/${decodeURIComponent(params.publication)}/${params.rkey}/l-quote/${params.quote}#${quotePosition?.pageId ? `${quotePosition.pageId}~` : ""}${quotePosition?.start.block.join(".")}_${quotePosition?.start.offset}`,
    {
      width: 620,
      height: 324,
      deviceScaleFactor: 2,
    },
  );
}
