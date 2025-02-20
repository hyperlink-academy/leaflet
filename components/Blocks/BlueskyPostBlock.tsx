import { useEntitySetContext } from "components/EntitySetProvider";
import { generateKeyBetween } from "fractional-indexing";
import { useCallback, useEffect, useState } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { BlockProps } from "./Block";
import { v7 } from "uuid";
import { useSmoker } from "components/Toast";
import { BlockEmbedSmall, CheckTiny } from "components/Icons";
import { Separator } from "components/Layout";
import { Input } from "components/Input";
import { isUrl } from "src/utils/isURL";
import { elementId } from "src/utils/elementId";
import { deleteBlock } from "./DeleteBlock";
import { focusBlock } from "src/utils/focusBlock";
import { useDrag } from "src/hooks/useDrag";

import { AtpAgent } from "@atproto/api";

export const BlueskyPostBlock = (props: BlockProps & { preview?: boolean }) => {
  //testing bsky post!
  //NB: moving to separate function!

  let { permissions } = useEntitySetContext();
  let { rep } = useReplicache();
  let url = useEntity(props.entityID, "bluesky-post/url");
  let isCanvasBlock = props.pageType === "canvas";

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

  //bsky test…
  //moved inside useEffect async function hmmmm…
  let [author, setAuthor] = useState<any>();
  let [record, setRecord] = useState<any>();
  useEffect(() => {
    const fetchPost = async () => {
      let testPost = await getBlueskyPost(
        "at://schlage.town/app.bsky.feed.post/3las6z4q7vs26",
      );
      setAuthor(testPost?.data.thread.post.author);
      setRecord(testPost?.data.thread.post.record);

      // if (!!author) {
      //   console.log("author display name: " + author.displayName);
      //   console.log("author handle: " + author.handle);
      //   console.log("author avatar: " + author.avatar);
      // }
      // if (!!record) {
      //   console.log("record created: " + record.createdAt);
      //   console.log("record text: " + record.text);
      // }
    };
    fetchPost();
  }, []);

  // TODO - re-enable input later!
  // if (!url) {
  //   if (!permissions.write) return null;
  //   return (
  //     <label
  //       id={props.preview ? undefined : elementId.block(props.entityID).input}
  //       className={`
  // 	  w-full h-[104px] p-2
  // 	  text-tertiary hover:text-accent-contrast hover:cursor-pointer
  // 	  flex flex-auto gap-2 items-center justify-center hover:border-2 border-dashed rounded-lg
  // 	  ${isSelected ? "border-2 border-tertiary" : "border border-border"}
  // 	  ${props.pageType === "canvas" && "bg-bg-page"}`}
  //       onMouseDown={() => {
  //         focusBlock(
  //           { type: props.type, value: props.entityID, parent: props.parent },
  //           { type: "start" },
  //         );
  //       }}
  //     >
  //       <BlockLinkInput {...props} />
  //     </label>
  //   );
  // }

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
      {/* TODO: render the actual bsky post */}
      <div
        className={`
			  flex flex-col relative w-full overflow-hidden group/blueskyPostBlock
			  ${isSelected ? "block-border-selected " : "block-border"}
			  `}
      >
        {author && record && (
          <>
            <div className="flex justify-between">
              <div className="flex items-center gap-2 p-2">
                <img
                  src={author?.avatar}
                  alt="avatar"
                  className="w-8 h-8 rounded-full"
                />
                {/* <div className="flex flex-col"></div> */}
                <span className="text-sm font-medium">
                  {author?.displayName}
                </span>
                <span className="text-xs text-tertiary">@{author?.handle}</span>
              </div>
              <div className="flex gap-2 items-center p-2">
                {/* <span>{record?.createdAt}</span> */}
                <span className="text-sm">{datetimeFormatted}</span>
                <span>
                  {/* TODO: replace hardcoded link! */}
                  {/* <a href="https://bsky.app/profile/schlage.town/post/3las6z4q7vs26">
                    src
                  </a> */}
                </span>
              </div>
            </div>
            <div className="p-2 flex flex-col gap-2">
              {/* TODO: maybe add attachments (embeds) + a toggle open? */}
              <div>
                <pre>{record?.text}</pre>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// TODO: maybe extract into a component…
// would just have to branch for the mutations (addLinkBlock or addEmbedBlock)
// OR now addBlueskyPostBlock!
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
    let link = linkValue;
    if (!linkValue.startsWith("http")) link = `https://${linkValue}`;

    // TODO: validate bsky post url

    // these mutations = simpler subset of addLinkBlock
    // TODO: add various bsky post facts

    // if (!rep) return;
    // await rep.mutate.assertFact({
    //   entity: entity,
    //   attribute: "block/type",
    //   data: { type: "block-type-union", value: "embed" },
    // });
    // await rep?.mutate.assertFact({
    //   entity: entity,
    //   attribute: "embed/url",
    //   data: {
    // 	type: "string",
    // 	value: link,
    //   },
    // });
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
        {/* <BlockEmbedSmall
		  className={`shrink-0  ${isSelected ? "text-tertiary" : "text-border"} `}
		/> */}
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
separate function to get bluesky post data

test posts:
https://bsky.app/profile/schlage.town/post/3las6z4q7vs26
https://bsky.app/profile/schlage.town/post/3lii5opjswk2w

uri is either w/ did or handle e.g.:
at://did:plc:44ybard66vv44zksje25o7dz/app.bsky.feed.post/3jwdwj2ctlk26
at://bnewbold.bsky.team/app.bsky.feed.post/3jwdwj2ctlk26
*/
export async function getBlueskyPost(uri: string) {
  const agent = new AtpAgent({ service: "https://public.api.bsky.app" });

  //test!
  // uri = "at://schlage.town/app.bsky.feed.post/3las6z4q7vs26";

  let blueskyPost: any = await agent
    // .getPosts({
    //   uris: [uri],
    // })
    .getPostThread({
      uri: uri,
      depth: 0,
      parentHeight: 0,
    })
    // .getPost({
    //   uri: uri,
    // })
    .then((res) => {
      return res;
    });
  return blueskyPost;
}
