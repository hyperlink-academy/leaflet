import { headers } from "next/headers";
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: { publication: string; did: string; rkey: string };
}) {
  if (process.env.NODE_ENV === "development") return;
  const headersList = await headers();
  const hostname = headersList.get("x-forwarded-host");
  let protocol = headersList.get("x-forwarded-proto");
  let path = `${protocol}://${hostname}/lish/${props.params.did}/${props.params.publication}/${props.params.rkey}`;
  let response = await fetch(
    `https://pro.microlink.io/?url=${path}&screenshot=true&viewport.width=1400&viewport.height=733&meta=false&embed=screenshot.url&force=true`,
    {
      headers: {
        "x-api-key": process.env.MICROLINK_API_KEY!,
      },
    },
  );
  let endTime = Date.now();

  return response;
}
