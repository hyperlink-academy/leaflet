import { RichText, AppBskyFeedPost, AppBskyRichtextFacet } from "@atproto/api";

// this function is ripped straight from the bluesky-social repo
// https://github.com/bluesky-social/social-app/blob/main/bskyembed/src/components/post.tsx#L119
export function BlueskyRichText({
  record,
}: {
  record: AppBskyFeedPost.Record | null;
}) {
  if (!record) return null;

  const rt = new RichText({
    text: record.text,
    facets: record.facets,
  });

  const richText = [];

  let counter = 0;
  for (const segment of rt.segments()) {
    if (
      segment.link &&
      AppBskyRichtextFacet.validateLink(segment.link).success
    ) {
      richText.push(
        <a
          key={counter}
          href={segment.link.uri}
          className="text-accent-contrast hover:underline"
          target="_blank"
        >
          {segment.text}
        </a>,
      );
    } else if (
      segment.mention &&
      AppBskyRichtextFacet.validateMention(segment.mention).success
    ) {
      richText.push(
        <a
          key={counter}
          href={`https://bsky.app/profile/${segment.mention.did}`}
          className="text-accent-contrast hover:underline"
          target="_blank"
        >
          {segment.text}
        </a>,
      );
    } else if (
      segment.tag &&
      AppBskyRichtextFacet.validateTag(segment.tag).success
    ) {
      richText.push(
        <a
          key={counter}
          href={`https://bsky.app/tag/${segment.tag.tag}`}
          className="text-accent-contrast hover:underline"
          target="_blank"
        >
          {segment.text}
        </a>,
      );
    } else {
      richText.push(segment.text);
    }

    counter++;
  }

  return <p className="whitespace-pre-wrap">{richText}</p>;
}
