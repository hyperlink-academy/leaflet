import { get_url_preview_data } from "actions/addLinkCard";
import { headers } from "next/headers";
export const runtime = "edge";
export default async function OpenGraphImage(props: {
  params: { doc_id: string };
}) {
  if (process.env.NODE_ENV === "development") return;
  const headersList = headers();
  const hostname = headersList.get("x-forwarded-host");
  let protocol = headersList.get("x-forwarded-proto");
  let path = `${protocol}://${hostname}/${props.params.doc_id}`;
  return fetch(
    `https://pro.microlink.io/?url=${path}&screenshot=&embed=screenshot.url`,
    {
      headers: {
        "x-api-key": process.env.MICROLINK_API_KEY!,
      },
    },
  );
}
