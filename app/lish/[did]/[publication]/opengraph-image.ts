import { getMicroLinkOgImage } from "src/utils/getMicroLinkOgImage";

export const runtime = "edge";
export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: Promise<{ publication: string; did: string }>;
}) {
  let params = await props.params;
  return getMicroLinkOgImage(
    `/lish/${encodeURIComponent(params.did)}/${encodeURIComponent(params.publication)}/`,
  );
}
