import { getMicroLinkOgImage } from "src/utils/getMicroLinkOgImage";

export const runtime = "edge";
export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: { leaflet_id: string };
}) {
  return getMicroLinkOgImage(`/${props.params.leaflet_id}`);
}
