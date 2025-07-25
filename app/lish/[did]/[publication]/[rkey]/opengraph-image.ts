import { getMicroLinkOgImage } from "src/utils/getMicroLinkOgImage";

export const runtime = "edge";
export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: { publication: string; did: string; rkey: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const searchParams = new URLSearchParams();
  Object.entries(props.searchParams).forEach(([key, value]) => {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, v));
      } else {
        searchParams.append(key, value);
      }
    }
  });
  const queryString = searchParams.toString();
  const url =
    `/lish/${decodeURIComponent(props.params.did)}/${decodeURIComponent(props.params.publication)}/${props.params.rkey}/` +
    (queryString ? `?${queryString}` : "");

  return getMicroLinkOgImage(url);
}
