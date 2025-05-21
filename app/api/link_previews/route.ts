export const maxDuration = 60;
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import * as z from "zod";
import { createClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

let expectedAPIResponse = z.object({
  data: z.object({
    description: z.string().optional().nullable(),
    author: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    image: z
      .object({
        url: z.string(),
        width: z.number().optional().nullable(),
        height: z.number().optional().nullable(),
      })
      .nullable()
      .optional(),
    logo: z
      .object({
        url: z.string(),
        width: z.number().optional().nullable(),
        height: z.number().optional().nullable(),
      })
      .nullable()
      .optional(),
  }),
});
export type LinkPreviewBody = { url: string; type: "meta" | "image" };
export async function POST(req: NextRequest) {
  let body = (await req.json()) as LinkPreviewBody;
  let url = encodeURIComponent(body.url);
  if (body.type === "meta") {
    let result = await get_link_metadata(url);
    return Response.json(result);
  } else {
    let result = await get_link_image_preview(url);
    return Response.json(result);
  }
}

export type LinkPreviewMetadataResult = ReturnType<typeof get_link_metadata>;
export type LinkPreviewImageResult = ReturnType<typeof get_link_image_preview>;

async function get_link_image_preview(url: string) {
  let image = await fetch(
    `https://pro.microlink.io/?url=${url}&screenshot&viewport.width=1400&viewport.height=1213&embed=screenshot.url&meta=false&force=true`,
    {
      headers: {
        "x-api-key": process.env.MICROLINK_API_KEY!,
      },
    },
  );

  let key = await hash(url);
  if (image.status === 200) {
    await supabase.storage
      .from("url-previews")
      .upload(key, await image.arrayBuffer(), {
        contentType: image.headers.get("content-type") || undefined,
        upsert: true,
      });
  } else {
    console.log("an error occured rendering the website", await image.text());
  }

  return {
    url: supabase.storage.from("url-previews").getPublicUrl(key, {
      transform: { width: 240, height: 208, resize: "contain" },
    }).data.publicUrl,
    height: 208,
    width: 240,
  };
}
async function get_link_metadata(url: string) {
  let response = await fetch(
    `https://pro.microlink.io/?url=${url}&force=true`,
    {
      headers: {
        "x-api-key": process.env.MICROLINK_API_KEY!,
      },
    },
  );

  let result = expectedAPIResponse.safeParse(await response.json());
  return result;
}

const hash = async (str: string) => {
  let hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str),
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
};
