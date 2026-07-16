import { ogScreenshotResponse } from "src/utils/screenshotPage";

export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: Promise<{ publication: string; did: string }>;
}) {
  let params = await props.params;
  return ogScreenshotResponse(
    `/lish/${encodeURIComponent(params.did)}/${encodeURIComponent(params.publication)}/`,
  );
}
