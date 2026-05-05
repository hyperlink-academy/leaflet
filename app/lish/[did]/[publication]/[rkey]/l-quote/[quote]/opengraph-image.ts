import { getMicroLinkOgImage } from "src/utils/getMicroLinkOgImage";
import { decodeQuotePosition } from "../../quotePosition";
import { getQuoteAltText } from "../../getQuoteAltText";

export const runtime = "edge";
export const revalidate = 60;

const SIZE = { width: 620, height: 324 };
const CONTENT_TYPE = "image/png";

export async function generateImageMetadata(props: {
  params: Promise<{ publication: string; did: string; rkey: string; quote: string }>;
}) {
  const params = await props.params;
  const quotePosition = decodeQuotePosition(params.quote);
  let alt = "Quoted excerpt from a Leaflet post";
  if (quotePosition) {
    const did = decodeURIComponent(params.did);
    const quoteText = await getQuoteAltText(did, params.rkey, quotePosition);
    if (quoteText) alt = quoteText;
  }
  return [{ id: "main", alt, size: SIZE, contentType: CONTENT_TYPE }];
}

export default async function OpenGraphImage(props: {
  params: Promise<{ publication: string; did: string; rkey: string; quote: string }>;
}) {
  let params = await props.params;
  let quotePosition = decodeQuotePosition(params.quote);
  return getMicroLinkOgImage(
    `/lish/${decodeURIComponent(params.did)}/${decodeURIComponent(params.publication)}/${params.rkey}/l-quote/${params.quote}#${quotePosition?.pageId ? `${quotePosition.pageId}~` : ""}${quotePosition?.start.block.join(".")}_${quotePosition?.start.offset}`,
    {
      width: SIZE.width,
      height: SIZE.height,
      deviceScaleFactor: 2,
    },
  );
}
