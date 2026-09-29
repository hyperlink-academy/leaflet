import type { BlobRef } from "@atproto/lexicon";
import { supabaseServerClient } from "supabase/serverClient";
import { processBlocksToPages } from "src/utils/factsToPagesRecord";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import type { PostEmailPage } from "emails/post";
import { storagePathFromSrc } from "src/utils/blobCleanup";

// Converts a draft to the pages an email renders, without touching a PDS:
// image blobs aren't uploaded — the email template detects an http(s) $link
// and uses it as a direct image URL — and polls render as "unsupported".
// `imagePaths` are the storage objects those links point at.
export async function draftPagesForEmail(root_entity: string) {
  const { data } = await supabaseServerClient.rpc("get_facts", {
    root: root_entity,
  });
  const facts = (data as unknown as Fact<Attribute>[]) || [];
  const { pages } = await processBlocksToPages({
    facts,
    root_entity,
    hooks: {
      uploadImage: async (src) =>
        ({
          ref: { $link: src },
          mimeType: "image/*",
          size: 0,
        }) as unknown as BlobRef,
      uploadPoll: null,
    },
  });
  const imagePaths = [
    ...new Set(
      facts
        .filter((f) => (f.data as { type?: string }).type === "image")
        .map((f) => storagePathFromSrc((f.data as { src: string }).src)),
    ),
  ];
  return { pages: pages as PostEmailPage[], imagePaths };
}

// A draft's contributors, for the byline. Checks the leaflet belongs to the
// publication first, so a caller can't read another draft's contributors.
export async function draftContributorDids(
  publicationUri: string,
  leafletId: string,
): Promise<string[]> {
  const { data: leafletInPub } = await supabaseServerClient
    .from("leaflets_in_publications")
    .select("leaflet")
    .eq("publication", publicationUri)
    .eq("leaflet", leafletId)
    .maybeSingle();
  if (!leafletInPub) return [];
  const { data } = await supabaseServerClient
    .from("leaflet_contributors")
    .select("contributor_did")
    .eq("leaflet", leafletId)
    .order("created_at", { ascending: true });
  return data?.map((c) => c.contributor_did) ?? [];
}
