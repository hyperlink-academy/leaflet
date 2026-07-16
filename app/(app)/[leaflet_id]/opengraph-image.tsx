import { ogScreenshotResponse } from "src/utils/screenshotPage";

export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: Promise<{ leaflet_id: string }>;
}) {
  let params = await props.params;
  return ogScreenshotResponse(`/${params.leaflet_id}`);
}
