import { getMicroLinkOgImage } from "src/utils/getMicroLinkOgImage";

export const runtime = "edge";
export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: { publication: string; did: string; rkey: string };
}) {
  return getMicroLinkOgImage(
    `/lish/${props.params.did}/${props.params.publication}/${props.params.rkey}`,
  );
}
