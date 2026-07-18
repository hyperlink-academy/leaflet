import { AppBskyFeedDefs } from "@atproto/api";
import { blobRefToSrc } from "./blobRefToSrc";
import type { NormalizedPublication } from "./normalizeRecords";

// Builds the compose-card preview embed shared by the publish flow (ShareOptions)
// and the "Share on Bluesky" modal (BskyShareModal).
//
// When `publication` is provided we mirror the standard.site enrichment
// bluesky's appview derives from the post's associatedRefs — the publication
// footer (icon/name), the site.standard.document/publication refs that mark the
// card as a standard.site link, and the author profile — so the preview matches
// the card the published post will show. See BskyEmbed's StandardSiteExternalEmbed.
// Without a publication it's a plain external link.
export function bskyPostEmbed(args: {
  url: string;
  title: string;
  description?: string;
  // Resolved thumbnail URL (not a blob ref).
  thumb?: string;
  // The thumbnail is still being generated — the preview card shows a pulsing
  // placeholder in the cover slot instead of omitting it.
  thumbPending?: boolean;
  // ISO date shown in the standard.site card footer.
  publishedAt?: string;
  publication?: NormalizedPublication;
  pubOwnerDid: string | undefined;
}): AppBskyFeedDefs.PostView["embed"] {
  const pub = args.publication;
  return {
    $type: "app.bsky.embed.external#view",
    external: {
      uri: args.url,
      title: args.title,
      description: args.description ?? "",
      ...(args.thumb ? { thumb: args.thumb } : {}),
      ...(args.thumbPending ? { thumbPending: true } : {}),
      ...(pub && {
        createdAt: args.publishedAt,
        source: {
          uri: pub.url,
          title: pub.name,
          icon:
            pub.icon && args.pubOwnerDid
              ? blobRefToSrc(pub.icon.ref, args.pubOwnerDid, undefined, {
                  width: 360,
                })
              : undefined,
        },
        associatedRefs: [
          {
            uri: `at://${args.pubOwnerDid}/site.standard.document/preview`,
          },
          { uri: `at://${args.pubOwnerDid}/site.standard.publication/preview` },
        ],
      }),
    },
  } as AppBskyFeedDefs.PostView["embed"];
}
