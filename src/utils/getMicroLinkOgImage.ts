import { headers } from "next/headers";

export async function getMicroLinkOgImage(path: string) {
  if (process.env.NODE_ENV === "development") return;
  const headersList = await headers();
  const hostname = headersList.get("x-forwarded-host");
  let protocol = headersList.get("x-forwarded-proto");
  let full_path = encodeURIComponent(`${protocol}://${hostname}${path}`);
  let response = await fetch(
    `https://pro.microlink.io/?url=${full_path}&screenshot=true&viewport.width=1400&viewport.height=733&meta=false&embed=screenshot.url&force=true`,
    {
      headers: {
        "x-api-key": process.env.MICROLINK_API_KEY!,
      },
    },
  );

  return response;
}
