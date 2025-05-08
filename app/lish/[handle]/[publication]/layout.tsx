import { IdResolver } from "@atproto/identity";
import { PublicationContextProvider } from "components/Providers/PublicationContext";
import { supabaseServerClient } from "supabase/serverClient";

const idResolver = new IdResolver();
export default async function PublicationLayout(props: {
  children: React.ReactNode;
  params: Promise<{
    publication: string;
    handle: string;
  }>;
}) {
  let did = await idResolver.handle.resolve((await props.params).handle);
  if (!did) return <>{props.children}</>;
  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select(
      "*, documents_in_publications(documents(*)), leaflets_in_publications(*, permission_tokens(*, permission_token_rights(*), custom_domain_routes!custom_domain_routes_edit_permission_token_fkey(*) ))",
    )
    .eq("identity_did", did)
    .eq("name", decodeURIComponent((await props.params).publication))
    .single();

  if (!publication) return <>{props.children}</>;
  return (
    <PublicationContextProvider publication={publication}>
      {props.children}
    </PublicationContextProvider>
  );
}
