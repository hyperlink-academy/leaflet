import { ogScreenshotResponse } from "src/utils/screenshotPage";

export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: Promise<{ did: string; rkey: string }>;
}) {
  let params = await props.params;
  return ogScreenshotResponse(
    `/subscribe/${encodeURIComponent(params.did)}/${encodeURIComponent(params.rkey)}/`,
    { waitUntil: "networkidle2", waitForTimeout: 2000 },
  );
}
