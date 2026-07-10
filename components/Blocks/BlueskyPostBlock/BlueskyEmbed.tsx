import { AppBskyFeedDefs } from "@atproto/api";
import { OpenPage } from "app/(app)/lish/[did]/[publication]/[rkey]/PostPages";
import { useOpenThread } from "app/(app)/lish/[did]/[publication]/[rkey]/Interactions/drawerThreadContext";
import { BskyEmbed } from "./BskyEmbed";

export { PostNotAvailable } from "./BskyEmbed";

// Reader-side embed: renders bluesky embeds via the shared BskyEmbed and routes
// quote-post clicks to the in-app thread drawer.
export const BlueskyEmbed = (props: {
  embed: Exclude<AppBskyFeedDefs.PostView["embed"], undefined>;
  postUrl?: string;
  className?: string;
  compact?: boolean;
  parent?: OpenPage;
}) => {
  const openThread = useOpenThread();
  return (
    <BskyEmbed
      content={props.embed}
      postUrl={props.postUrl}
      className={props.className}
      compact={props.compact}
      onQuoteClick={(uri) => openThread(props.parent, { type: "thread", uri })}
    />
  );
};
