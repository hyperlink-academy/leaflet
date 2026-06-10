"use server";

import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { createLeaflet } from "src/utils/createLeaflet";

export async function createNewLeaflet({
  pageType,
  redirectUser,
  firstBlockType,
  welcomeModal,
  addToHome,
  addToHomepage = true,
}: {
  pageType: "canvas" | "doc";
  redirectUser: boolean;
  firstBlockType?: "h1" | "text";
  welcomeModal?: boolean;
  addToHome?: boolean;
  addToHomepage?: boolean;
}) {
  let auth_token = (await cookies()).get("auth_token")?.value;

  const { permTokenId } = await createLeaflet({
    pageType,
    firstBlocks: [firstBlockType === "text" ? "text" : "h1"],
    rootFacts: [
      {
        attribute: "theme/page-leaflet-watermark",
        data: { type: "boolean", value: true },
      },
    ],
    // Resolves auth_token → identity in the same round trip and inserts
    // nothing when the token is missing/invalid.
    tailCte:
      auth_token && addToHomepage
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

  if (redirectUser)
    redirect(
      `/${permTokenId}?focusFirstBlock${welcomeModal ? "&welcomeModal" : ""}${addToHome ? "&addToHome" : ""}`,
    );
  return permTokenId;
}
