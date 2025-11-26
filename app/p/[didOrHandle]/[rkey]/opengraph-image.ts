import { getMicroLinkOgImage } from "src/utils/getMicroLinkOgImage";

export const runtime = "edge";
export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: Promise<{ rkey: string; didOrHandle: string }>;
}) {
  let params = await props.params;
  return getMicroLinkOgImage(
    `/p/${params.didOrHandle}/${params.rkey}/`,
  );
}
