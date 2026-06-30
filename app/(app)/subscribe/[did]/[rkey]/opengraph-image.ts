import { getMicroLinkOgImage } from "src/utils/getMicroLinkOgImage";

export const runtime = "edge";
export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: Promise<{ did: string; rkey: string }>;
}) {
  let params = await props.params;
  return getMicroLinkOgImage(
    `/subscribe/${encodeURIComponent(params.did)}/${encodeURIComponent(params.rkey)}/`,
  );
}
