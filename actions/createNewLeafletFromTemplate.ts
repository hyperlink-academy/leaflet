"use server";

import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { copyLeafletContents } from "src/utils/copyLeafletContents";
import { supabaseServerClient } from "supabase/serverClient";

export async function createNewLeafletFromTemplate(
  template_id: string,
  redirectUser?: boolean,
) {
  let auth_token = (await cookies()).get("auth_token")?.value;
  let { data: template } = await supabaseServerClient
    .from("permission_tokens")
    .select("root_entity")
    .eq("id", template_id)
    .single();
  if (!template?.root_entity) return { error: "Leaflet not found" } as const;

  let { permTokenId } = await copyLeafletContents({
    rootEntity: template.root_entity,
    tailCte: auth_token
      ? ({ permTokenId }) => sql`, homepage_insert AS (
          INSERT INTO permission_token_on_homepage (token, identity)
          SELECT ${permTokenId}, identities.id
          FROM email_auth_tokens
          JOIN identities ON email_auth_tokens.identity = identities.id
          WHERE email_auth_tokens.id = ${auth_token}
            AND email_auth_tokens.confirmed = true
        )`
      : undefined,
  });

  if (redirectUser) redirect(`/${permTokenId}`);
  return { id: permTokenId, error: null } as const;
}
