import { get_url_preview_data } from "actions/addLinkCard";
import { headers } from "next/headers";
export default async function OpenGraphImage(props: {
  params: { doc_id: string };
}) {
  if (process.env.NODE_ENV === "development") return;
  const headersList = headers();
  const hostname = headersList.get("x-forwarded-host");
  let protocol = headersList.get("x-forwardeda-proto");
  headersList.forEach(console.log);
  let url_preview = await get_url_preview_data(
    `${protocol}://${hostname}/${props.params.doc_id}`,
  );
  if (url_preview.data) return fetch(url_preview.data?.data.screenshot.url);
  return null;
}
