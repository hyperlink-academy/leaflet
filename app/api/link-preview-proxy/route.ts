import { NextRequest } from "next/server";

export const runtime = "edge";
export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  let url = req.nextUrl.searchParams.get("url");
  if (!url) return new Response("No URL provided", { status: 404 });

  return fetch(
    `https://pro.microlink.io/?url=${url}&screenshot&embed=screenshot.url`,
    {
      headers: {
        "x-api-key": process.env.MICROLINK_API_KEY!,
      },
    },
  );
}
