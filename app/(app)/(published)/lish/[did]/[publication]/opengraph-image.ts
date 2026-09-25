import { ogScreenshotResponse } from "src/utils/screenshotPage";

// OG content is effectively immutable post-publish, and each regeneration is a
// multi-second remote-browser render billed for its full wall time — unfurl
// bots re-fetch these constantly.
export const revalidate = 86400;

export async function generateStaticParams() {
  return [];
}

export const size = { width: 1400, height: 733 };
export const contentType = "image/png";
export const alt = "Preview of this publication's home page";

export default async function OpenGraphImage(props: {
  params: Promise<{ publication: string; did: string }>;
}) {
  let params = await props.params;
  return ogScreenshotResponse(
    `/lish/${encodeURIComponent(params.did)}/${encodeURIComponent(params.publication)}/`,
  );
}
