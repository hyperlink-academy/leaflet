import { headers } from "next/headers";

export async function getMicroLinkOgImage(
  path: string,
  options?: { width?: number; height?: number; deviceScaleFactor?: number },
) {
  const headersList = await headers();
  const hostname = headersList.get("x-forwarded-host");
  let protocol = headersList.get("x-forwarded-proto");
  let full_path = `${protocol}://${hostname}${path}`;
  let response = await fetch(
    `https://pro.microlink.io/?url=${encodeURIComponent(full_path)}&screenshot=true&viewport.width=${options?.width || 1200}&viewport.height=${options?.height || 733}&viewport.deviceScaleFactor=${options?.deviceScaleFactor || 1}&meta=false&embed=screenshot.url&force=true`,
    {
      headers: {
        "x-api-key": process.env.MICROLINK_API_KEY!,
      },
    },
  );

  return response;
}
