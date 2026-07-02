import { getMicroLinkOgImage } from "src/utils/getMicroLinkOgImage";

export default async function OpenGraphImage(props: {
  params: Promise<{ leaflet_id: string }>;
}) {
  let params = await props.params;
  return getMicroLinkOgImage(`/${params.leaflet_id}`);
}
