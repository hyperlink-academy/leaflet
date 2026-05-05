import { getMicroLinkOgImage } from "src/utils/getMicroLinkOgImage";
import { decodeQuotePosition } from "app/lish/[did]/[publication]/[rkey]/quotePosition";
import { getQuoteAltText } from "app/lish/[did]/[publication]/[rkey]/getQuoteAltText";
import { idResolver } from "app/(home-pages)/reader/idResolver";

export const runtime = "edge";
export const revalidate = 60;

const SIZE = { width: 620, height: 324 };
const CONTENT_TYPE = "image/png";

async function resolveDid(didOrHandle: string): Promise<string | null> {
  if (didOrHandle.startsWith("did:")) return didOrHandle;
  try {
    const resolved = await idResolver.handle.resolve(didOrHandle);
    return resolved ?? null;
  } catch {
    return null;
  }
}

export async function generateImageMetadata(props: {
  params: Promise<{ didOrHandle: string; rkey: string; quote: string }>;
}) {
  const params = await props.params;
  const quotePosition = decodeQuotePosition(params.quote);
  let alt = "Quoted excerpt from a Leaflet post";
  if (quotePosition) {
    const did = await resolveDid(decodeURIComponent(params.didOrHandle));
    if (did) {
      const quoteText = await getQuoteAltText(did, params.rkey, quotePosition);
      if (quoteText) alt = quoteText;
    }
  }
  return [{ id: "main", alt, size: SIZE, contentType: CONTENT_TYPE }];
}

export default async function OpenGraphImage(props: {
  params: Promise<{ didOrHandle: string; rkey: string; quote: string }>;
}) {
  let params = await props.params;
  let quotePosition = decodeQuotePosition(params.quote);
  return getMicroLinkOgImage(
    `/p/${decodeURIComponent(params.didOrHandle)}/${params.rkey}/l-quote/${params.quote}#${quotePosition?.pageId ? `${quotePosition.pageId}~` : ""}${quotePosition?.start.block.join(".")}_${quotePosition?.start.offset}`,
    {
      width: SIZE.width,
      height: SIZE.height,
      deviceScaleFactor: 2,
    },
  );
}
