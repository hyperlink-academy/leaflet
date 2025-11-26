import { getMicroLinkOgImage } from "src/utils/getMicroLinkOgImage";

export const runtime = "edge";
export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: { rkey: string; didOrHandle: string };
}) {
  return getMicroLinkOgImage(
    `/p/${props.params.didOrHandle}/${props.params.rkey}/`,
  );
}
