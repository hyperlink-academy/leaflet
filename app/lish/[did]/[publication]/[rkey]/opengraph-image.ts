import { getMicroLinkOgImage } from "src/utils/getMicroLinkOgImage";

export const runtime = "edge";
export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: Promise<{ publication: string; did: string; rkey: string }>;
}) {
  let params = await props.params;
  return getMicroLinkOgImage(
    `/lish/${decodeURIComponent(params.did)}/${decodeURIComponent(params.publication)}/${params.rkey}/`,
  );
}
