import { sql } from "drizzle-orm";
import type { PubLeafletPublication } from "lexicons/api";

import { createLeaflet, type DefaultBlockSpec } from "src/utils/createLeaflet";
import { themeFacts } from "components/ThemeManager/themeFacts";
import { supabaseServerClient } from "supabase/serverClient";

// Create and seed a publication's draft leaflet: a home page at route "/"
// plus theme/* facts mirroring the published theme. Never clobbers an
// existing draft_leaflet — if a concurrent request won, its token is returned.
export async function createPublicationDraftLeaflet(args: {
  publication_uri: string;
  did: string;
  description?: string;
  theme?: PubLeafletPublication.Theme;
}): Promise<string> {
  const firstBlocks: DefaultBlockSpec[] = [
    ...(args.description
      ? [{ type: "text" as const, content: args.description }]
      : []),
    "posts-list",
    "signup",
  ];

  const { permTokenId } = await createLeaflet({
    pageType: "doc",
    firstBlocks,
    rootFacts: themeFacts(args.theme, args.did),
    pageFacts: [
      { attribute: "page/type", data: { type: "page-type-union", value: "doc" } },
      { attribute: "page/route", data: { type: "string", value: "/" } },
      { attribute: "page/title", data: { type: "string", value: "Home" } },
    ],
    tailCte: ({ permTokenId }) => sql`, attach AS (
      UPDATE publications SET draft_leaflet = ${permTokenId}
      WHERE uri = ${args.publication_uri} AND draft_leaflet IS NULL
    )`,
  });

  const { data } = await supabaseServerClient
    .from("publications")
    .select("draft_leaflet")
    .eq("uri", args.publication_uri)
    .single();
  return data?.draft_leaflet ?? permTokenId;
}
