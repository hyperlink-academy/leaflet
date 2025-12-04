import { getMicroLinkOgImage } from "src/utils/getMicroLinkOgImage";

export const runtime = "edge";
export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: Promise<{ leaflet_id: string }>;
}) {
  let params = await props.params;
  return getMicroLinkOgImage(`/${params.leaflet_id}`);
}
