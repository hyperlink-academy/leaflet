import { ogScreenshotResponse } from "src/utils/screenshotPage";

// OG content is effectively immutable post-publish, and each regeneration is a
// multi-second remote-browser render billed for its full wall time — unfurl
// bots re-fetch these constantly.
export const revalidate = 86400;

export default async function OpenGraphImage(props: {
  params: Promise<{ did: string; rkey: string }>;
}) {
  let params = await props.params;
  return ogScreenshotResponse(
    `/subscribe/${encodeURIComponent(params.did)}/${encodeURIComponent(params.rkey)}/`,
    { waitUntil: "networkidle2", waitForTimeout: 2000 },
  );
}
