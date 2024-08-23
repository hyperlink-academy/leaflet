"use server";
import * as z from "zod";
import { createClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

export async function addLinkCard(args: { link: string }) {
  let result = await get_url_preview_data(args.link);
  return result;
}

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

export const get_url_preview_data = async (url: string) => {
  let [response, image] = await Promise.all([
    fetch(`https://pro.microlink.io/?url=${url}`, {
      headers: {
        "x-api-key": process.env.MICROLINK_API_KEY!,
      },
    }),
    fetch(
      `https://pro.microlink.io/?url=${url}&screenshot&viewport.width=1247&viewport.height=1080&embed=screenshot.url`,
      {
        headers: {
          "x-api-key": process.env.MICROLINK_API_KEY!,
        },
      },
    ),
  ]);

  let key = await hash(url);
  supabase.storage.from("url-previews").upload(key, await image.arrayBuffer(), {
    contentType: image.headers.get("content-type") || undefined,
  });

  let result = expectedAPIResponse.safeParse(await response.json());
  return {
    ...result,
    screenshot: {
      url: supabase.storage.from("url-previews").getPublicUrl(key, {
        transform: { width: 240, height: 208, resize: "contain" },
      }).data.publicUrl,
      height: 208,
      width: 240,
    },
  };
};

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
