import { AtUri } from "@atproto/syntax";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerClient } from "supabase/serverClient";

export default async function AllPubs(props: {
  params: Promise<{ url: string }>;
}) {
  if (process.env.NODE_ENV === "production")
    return new Response("Not allowed", { status: 403 });
  let { url } = await props.params;
  let { data: publication } = await supabaseServerClient
    .from("publication_domains")
    .select("*")
    .eq("domain", url)
    .single();

  if (!publication) return <div>Publication not found</div>;
  let uri = new AtUri(publication.publication);
  return redirect(`/lish/${uri.host}/${uri.rkey}`);
}
