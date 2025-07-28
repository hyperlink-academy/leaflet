import { getMicroLinkOgImage } from "src/utils/getMicroLinkOgImage";
import { decodeQuotePosition } from "../../quotePosition";

export const runtime = "edge";
export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: { publication: string; did: string; rkey: string; quote: string };
}) {
  let quotePosition = decodeQuotePosition(props.params.quote);
  return getMicroLinkOgImage(
    `/lish/${decodeURIComponent(props.params.did)}/${decodeURIComponent(props.params.publication)}/${props.params.rkey}/l-quote/${props.params.quote}#${quotePosition?.start.block.join(".")}_${quotePosition?.start.offset}`,
  );
}
