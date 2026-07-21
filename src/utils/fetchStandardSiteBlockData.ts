import { ids } from "lexicons/api/lexicons";
import {
  PubLeafletBlocksStandardSitePost,
  PubLeafletBlocksStandardSitePublication,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { type $Typed } from "lexicons/api/util";
import { supabaseServerClient } from "supabase/serverClient";
import {
  get_standard_site_posts,
  type StandardSitePostData,
} from "app/api/rpc/[command]/get_standard_site_posts";
import {
  get_standard_site_publications,
  type StandardSitePublicationData,
} from "app/api/rpc/[command]/get_standard_site_publications";
import { extractBlocksByType } from "app/(app)/lish/[did]/[publication]/[rkey]/extractBlocksByType";

// Resolves the standard-site post/publication blocks referenced by a document's
// blocks into renderable data keyed by AT-URI. Used by the newsletter send
// paths, which render outside the app's SWR data providers. References that
// don't resolve are simply absent from the maps, so their blocks degrade to
// the "not found" notice instead of failing the send.
export async function fetchStandardSiteBlockData(
  blocks: PubLeafletPagesLinearDocument.Block[],
): Promise<{
  standardSitePosts: Record<string, StandardSitePostData>;
  standardSitePublications: Record<string, StandardSitePublicationData>;
}> {
  const postUris = Array.from(
    new Set(
      extractBlocksByType<$Typed<PubLeafletBlocksStandardSitePost.Main>>(
        blocks,
        ids.PubLeafletBlocksStandardSitePost,
      ).map((b) => b.block.uri),
    ),
  );
  const publicationUris = Array.from(
    new Set(
      extractBlocksByType<$Typed<PubLeafletBlocksStandardSitePublication.Main>>(
        blocks,
        ids.PubLeafletBlocksStandardSitePublication,
      ).map((b) => b.block.uri),
    ),
  );

  const [postsResult, publicationsResult] = await Promise.all([
    postUris.length > 0
      ? get_standard_site_posts.handler(
          { uris: postUris },
          { supabase: supabaseServerClient },
        )
      : null,
    publicationUris.length > 0
      ? get_standard_site_publications.handler(
          { uris: publicationUris },
          { supabase: supabaseServerClient },
        )
      : null,
  ]);

  return {
    standardSitePosts: Object.fromEntries(
      (postsResult?.result.posts ?? []).map((p) => [p.uri, p]),
    ),
    standardSitePublications: Object.fromEntries(
      (publicationsResult?.result.publications ?? []).map((p) => [p.uri, p]),
    ),
  };
}
