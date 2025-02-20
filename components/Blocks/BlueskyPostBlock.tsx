import { useEntitySetContext } from "components/EntitySetProvider";
import { generateKeyBetween } from "fractional-indexing";
import { useCallback, useEffect, useState } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { BlockProps } from "./Block";
import { v7 } from "uuid";
import { useSmoker } from "components/Toast";
import {
  BlueskySolidSmall,
  BlueskySolidTiny,
  CheckTiny,
} from "components/Icons";
import { Separator } from "components/Layout";
import { Input } from "components/Input";
import { isUrl } from "src/utils/isURL";
import { elementId } from "src/utils/elementId";
import { deleteBlock } from "./DeleteBlock";
import { focusBlock } from "src/utils/focusBlock";
import { AtpAgent } from "@atproto/api";

export const BlueskyPostBlock = (props: BlockProps & { preview?: boolean }) => {
  let { permissions } = useEntitySetContext();
  let { rep } = useReplicache();

  // TODO: get saved bsky data!
  // orig entered post url, author, record, etc.
  // maybe embed data too (several types)
  let url = useEntity(props.entityID, "bluesky-post/url");

  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );

  useEffect(() => {
    if (props.preview) return;
    let input = document.getElementById(elementId.block(props.entityID).input);
    if (isSelected) {
      input?.focus();
    } else input?.blur();
  }, [isSelected, props.entityID, props.preview]);

  // bluesky post data
  // init
  let [author, setAuthor] = useState<any>();
  let [record, setRecord] = useState<any>();
  // get the data
  useEffect(() => {
    const fetchPost = async () => {
      // TODO: test with various embed types

      // construct bsky post uri from url!
      // go from e.g.: https://bsky.app/profile/schlage.town/post/3las6z4q7vs26
      // to uid, e.g.: at://schlage.town/app.bsky.feed.post/3las6z4q7vs26
      // or: https://bsky.app/profile/did:plc:jjsc5rflv3cpv6hgtqhn2dcm/post/3lggvlrhu3s2l
      // to: at://did:plc:jjsc5rflv3cpv6hgtqhn2dcm/app.bsky.feed.post/3lggvlrhu3s2l

      const urlParts = url?.data.value.split("/");
      const userDidOrHandle = urlParts ? urlParts[4] : ""; // "schlage.town" or "did:plc:jjsc5rflv3cpv6hgtqhn2dcm"
      const collection = "app.bsky.feed.post";
      const postId = urlParts ? urlParts[6] : "";

      const uri = `at://${userDidOrHandle}/${collection}/${postId}`;
      console.log(uri);

      let post = await getBlueskyPost(uri);
      setAuthor(post?.data.thread.post.author);
      setRecord(post?.data.thread.post.record);
    };
    fetchPost();
  }, []);

  if (!url) {
    if (!permissions.write) return null;
    return (
      <label
        id={props.preview ? undefined : elementId.block(props.entityID).input}
        className={`
  	  w-full h-[104px] p-2
  	  text-tertiary hover:text-accent-contrast hover:cursor-pointer
  	  flex flex-auto gap-2 items-center justify-center hover:border-2 border-dashed rounded-lg
  	  ${isSelected ? "border-2 border-tertiary" : "border border-border"}
  	  ${props.pageType === "canvas" && "bg-bg-page"}`}
        onMouseDown={() => {
          focusBlock(
            { type: props.type, value: props.entityID, parent: props.parent },
            { type: "start" },
          );
        }}
      >
        <BlockLinkInput {...props} />
      </label>
    );
  }

  let datetime = new Date(record?.createdAt);
  let datetimeFormatted = datetime.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

  return (
    <div className={`w-full`}>
      <div
        className={`
			  flex flex-col relative w-full overflow-hidden group/blueskyPostBlock
			  ${isSelected ? "block-border-selected " : "block-border"}
			  `}
      >
        {author && record ? (
          <>
            <div className="flex justify-between">
              <div className="flex items-center gap-2 p-2">
                <img
                  src={author?.avatar}
                  alt="avatar"
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm font-medium">
                  {author?.displayName}
                </span>
                <a
                  className="text-xs hover:text-primary hover:no-underline"
                  target="_blank"
                  href={`https://bsky.app/profile/${author?.handle}`}
                >
                  <span>@{author?.handle}</span>
                </a>
              </div>
              <div className="flex gap-2 items-center p-2">
                <span className="text-sm">{datetimeFormatted}</span>
                <span>
                  <a
                    className="hover:text-primary"
                    target="_blank"
                    href={url?.data.value}
                  >
                    <BlueskySolidTiny />
                  </a>
                </span>
              </div>
            </div>
            <div className="p-2 flex flex-col gap-2">
              {/* TODO: maybe add attachments (embeds) + a toggle open? */}
              <div>
                <pre className="whitespace-pre-wrap">{record?.text}</pre>
              </div>
            </div>
          </>
        ) : (
          <div className="p-4 italic">
            Sorry, we couldn't get data for that post! Please make sure you
            pasted a publicly viewable bsky.app post link.
          </div>
        )}
      </div>
    </div>
  );
};

// TODO: maybe extract into a component…
// would have to branch for mutations (addLinkBlock or addEmbedBlock or addBlueskyPostBlock)
const BlockLinkInput = (props: BlockProps) => {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let isLocked = useEntity(props.entityID, "block/is-locked")?.data.value;

  let entity_set = useEntitySetContext();
  let [linkValue, setLinkValue] = useState("");
  let { rep } = useReplicache();
  let submit = async () => {
    let entity = props.entityID;
    if (!entity) {
      entity = v7();

      await rep?.mutate.addBlock({
        permission_set: entity_set.set,
        factID: v7(),
        parent: props.parent,
        type: "card",
        position: generateKeyBetween(props.position, props.nextPosition),
        newEntityID: entity,
      });
    }

    // let link = linkValue;
    // if (!linkValue.startsWith("http")) link = `https://${linkValue}`;

    // TODO: validate bsky post url
    // go from e.g.: https://bsky.app/profile/schlage.town/post/3las6z4q7vs26
    // to uid, e.g.: at://schlage.town/app.bsky.feed.post/3las6z4q7vs26
    // maybe handle case where did is in url?
    // can maybe do here first…or move in new function (see below)

    // TODO: add various bsky post facts instead of the ones below
    // AND MOVE TO SEPARATE ASYNC FUNCTION
    // with all the data we need + maybe more durable user did for good measure
    // see e.g. addLinkBlock

    // TEMP TEST MUTATIONS
    if (!rep) return;
    await rep.mutate.assertFact({
      entity: entity,
      attribute: "block/type",
      data: { type: "block-type-union", value: "bluesky-post" },
    });
    await rep?.mutate.assertFact({
      entity: entity,
      attribute: "bluesky-post/url",
      data: {
        type: "string",
        value: linkValue,
      },
    });
  };
  let smoker = useSmoker();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        let rect = document
          .getElementById("bluesky-post-block-submit")
          ?.getBoundingClientRect();
        if (!linkValue || linkValue === "") {
          smoker({
            error: true,
            text: "no url!",
            position: { x: rect ? rect.left + 12 : 0, y: rect ? rect.top : 0 },
          });
          return;
        }
        if (!isUrl(linkValue)) {
          smoker({
            error: true,
            text: "invalid url!",
            position: {
              x: rect ? rect.left + 12 : 0,
              y: rect ? rect.top : 0,
            },
          });
          return;
        }
        submit();
      }}
    >
      <div className={`max-w-sm flex gap-2 rounded-md text-secondary`}>
        {/* TODO: bsky icon? */}
        <BlueskySolidSmall
          className={`shrink-0  ${isSelected ? "text-tertiary" : "text-border"} `}
        />
        <Separator />
        <Input
          type="text"
          className="w-full grow border-none outline-none bg-transparent "
          placeholder="bsky.app/post-url"
          value={linkValue}
          disabled={isLocked}
          onChange={(e) => setLinkValue(e.target.value)}
        />
        <button
          type="submit"
          id="bluesky-post-block-submit"
          className={`p-1 ${isSelected && !isLocked ? "text-accent-contrast" : "text-border"}`}
          onMouseDown={(e) => {
            e.preventDefault();
            if (!linkValue || linkValue === "") {
              smoker({
                error: true,
                text: "no url!",
                position: { x: e.clientX + 12, y: e.clientY },
              });
              return;
            }
            if (!isUrl(linkValue)) {
              smoker({
                error: true,
                text: "invalid url!",
                position: { x: e.clientX + 12, y: e.clientY },
              });
              return;
            }
            submit();
          }}
        >
          <CheckTiny />
        </button>
      </div>
    </form>
  );
};

/*
get bluesky post data

uri is either w/ did or handle e.g.:
at://did:plc:44ybard66vv44zksje25o7dz/app.bsky.feed.post/3jwdwj2ctlk26
at://bnewbold.bsky.team/app.bsky.feed.post/3jwdwj2ctlk26

NB: getPosts isn't working, and getPost doesn't get the full hydrated post
but getPostThread works so just using that for now!

// TODO: catch errors
// e.g. seeing one like "uri must be a valid at-uri"
*/
export async function getBlueskyPost(uri: string) {
  const agent = new AtpAgent({ service: "https://public.api.bsky.app" });

  let blueskyPost: any = await agent
    .getPostThread({
      uri: uri,
      depth: 0,
      parentHeight: 0,
    })
    .then((res) => {
      return res;
    });
  return blueskyPost;
}
