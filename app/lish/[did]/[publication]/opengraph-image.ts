import { getMicroLinkOgImage } from "src/utils/getMicroLinkOgImage";

export const runtime = "edge";
export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: { publication: string; did: string };
}) {
  return getMicroLinkOgImage(
    `/lish/${decodeURIComponent(props.params.did)}/${decodeURIComponent(props.params.publication)}`,
  );
}
