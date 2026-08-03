import { AtUri } from "@atproto/syntax";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { supabaseServerClient } from "supabase/serverClient";

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ url: string }> },
) {
  if (process.env.NODE_ENV === "production")
    return new Response("Not allowed", { status: 403 });
  let { url } = await props.params;
  let { data: publication } = await supabaseServerClient
    .from("publication_domains")
    .select("*")
    .eq("domain", url)
    .single();

  if (!publication)
    return new Response("Publication not found", { status: 404 });
  let uri = new AtUri(publication.publication);
  return redirect(`/lish/${uri.host}/${uri.rkey}`);
}
