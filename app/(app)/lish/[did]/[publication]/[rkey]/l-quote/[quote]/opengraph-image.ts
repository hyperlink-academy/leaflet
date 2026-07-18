import { ogScreenshotResponse } from "src/utils/screenshotPage";
import { decodeQuotePosition } from "../../quotePosition";

// OG content is effectively immutable post-publish, and each regeneration is a
// multi-second remote-browser render billed for its full wall time — unfurl
// bots re-fetch these constantly.
export const revalidate = 86400;

export default async function OpenGraphImage(props: {
  params: Promise<{
    publication: string;
    did: string;
    rkey: string;
    quote: string;
  }>;
}) {
  let params = await props.params;
  let quotePosition = decodeQuotePosition(params.quote);
  return ogScreenshotResponse(
    `/lish/${decodeURIComponent(params.did)}/${decodeURIComponent(params.publication)}/${params.rkey}/l-quote/${params.quote}#${quotePosition?.pageId ? `${quotePosition.pageId}~` : ""}${quotePosition?.start.block.join(".")}_${quotePosition?.start.offset}`,
    { width: 620, height: 324, deviceScaleFactor: 2 },
  );
}
