import { AppBskyFeedDefs, AtUri, BlobRef } from "@atproto/api";
import { blobRefToSrc } from "./blobRefToSrc";
import type { NormalizedPublication } from "./normalizeRecords";

// The publication descriptor the share/publish previews need to render the
// standard.site card footer. `did` is the publication owner's did; `uri` is the
// full publication record at-uri, used to attach the real strong ref when
// actually posting a share.
export type SharePublication = {
  did: string;
  uri?: string;
  url?: string;
  name?: string;
  icon?: BlobRef;
};

// The post author's profile, shown as the "by @handle" byline in the card. Its
// did anchors the site.standard.document ref (the doc lives in the author's PDS).
export type ShareAuthor = {
  did: string;
  handle?: string;
  displayName?: string;
  avatar?: string;
};

// Builds a SharePublication from a normalized publication record and its at://
// uri (whose host is the owner's did). Returns undefined when either is missing,
// so the preview falls back to a plain external link.
export function sharePublicationInfo(
  pub: NormalizedPublication | null | undefined,
  publicationUri: string | undefined,
): SharePublication | undefined {
  if (!pub || !publicationUri) return undefined;
  return {
    did: new AtUri(publicationUri).host,
    uri: publicationUri,
    url: pub.url,
    name: pub.name,
    icon: pub.icon,
  };
}

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
  // ISO date shown in the standard.site card footer.
  publishedAt?: string;
  publication?: SharePublication;
  author?: ShareAuthor;
}): AppBskyFeedDefs.PostView["embed"] {
  const pub = args.publication;
  return {
    $type: "app.bsky.embed.external#view",
    external: {
      uri: args.url,
      title: args.title,
      description: args.description ?? "",
      ...(args.thumb ? { thumb: args.thumb } : {}),
      ...(pub && {
        createdAt: args.publishedAt,
        source: {
          uri: pub.url,
          title: pub.name,
          icon: pub.icon ? blobRefToSrc(pub.icon.ref, pub.did) : undefined,
        },
        associatedRefs: [
          {
            uri: `at://${args.author?.did ?? pub.did}/site.standard.document/preview`,
          },
          { uri: `at://${pub.did}/site.standard.publication/preview` },
        ],
        ...(args.author && { associatedProfiles: [args.author] }),
      }),
    },
  } as AppBskyFeedDefs.PostView["embed"];
}
