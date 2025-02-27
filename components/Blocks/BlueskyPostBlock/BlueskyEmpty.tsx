import { useEntitySetContext } from "components/EntitySetProvider";
import { generateKeyBetween } from "fractional-indexing";
import { useState } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { BlockProps } from "../Block";
import { v7 } from "uuid";
import { useSmoker } from "components/Toast";
import { BlockBlueskySmall, CheckTiny } from "components/Icons";
import { Separator } from "components/Layout";
import { Input } from "components/Input";
import { isUrl } from "src/utils/isURL";
import { AppBskyFeedDefs, AtpAgent } from "@atproto/api";

export const BlueskyPostEmpty = (props: BlockProps) => {
  let { rep } = useReplicache();
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let isLocked = useEntity(props.entityID, "block/is-locked")?.data.value;

  let entity_set = useEntitySetContext();
  let [urlValue, setUrlValue] = useState("");

  let submit = async () => {
    let entity = props.entityID;

    // create a new block
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

    //construct bsky post uri from url
    let urlParts = urlValue?.split("/");
    let userDidOrHandle = urlParts ? urlParts[4] : ""; // "schlage.town" or "did:plc:jjsc5rflv3cpv6hgtqhn2dcm"
    let collection = "app.bsky.feed.post";
    let postId = urlParts ? urlParts[6] : "";
    let uri = `at://${userDidOrHandle}/${collection}/${postId}`;

    let post = await getBlueskyPost(uri, () => {
      let rect = document
        .getElementById("bluesky-post-block-submit")
        ?.getBoundingClientRect();
      smoker({
        error: true,
        text: "post not found!",
        position: {
          x: (rect && rect.left + 12) || 0,
          y: (rect && rect.top) || 0,
        },
      });
    });
    if (!rep || !post || post === undefined) return;

    await rep.mutate.assertFact({
      entity: entity,
      attribute: "block/type",
      data: { type: "block-type-union", value: "bluesky-post" },
    });
    await rep?.mutate.assertFact({
      entity: entity,
      attribute: "block/bluesky-post",
      data: {
        type: "bluesky-post",
        //TODO: this is a hack to get rid of a nested Array buffer which cannot be frozen, which replicache does on write.
        value: JSON.parse(JSON.stringify(post.data.thread)),
      },
    });
  };
  let smoker = useSmoker();
  function errorSmokers(x: number, y: number) {
    if (!urlValue || urlValue === "") {
      smoker({
        error: true,
        text: "no url!",
        position: {
          x: x,
          y: y,
        },
      });
      return;
    }
    if (!isUrl(urlValue) || !urlValue.includes("bsky.app")) {
      smoker({
        error: true,
        text: "invalid bluesky url!",
        position: {
          x: x,
          y: y,
        },
      });
      return;
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        let rect = document
          .getElementById("bluesky-post-block-submit")
          ?.getBoundingClientRect();

        rect && errorSmokers(rect.left + 12, rect.top);
        submit();
      }}
    >
      <div className={`max-w-sm flex gap-2 rounded-md text-secondary`}>
        {/* TODO: bsky icon? */}
        <BlockBlueskySmall
          className={`shrink-0  ${isSelected ? "text-tertiary" : "text-border"} `}
        />
        <Separator />
        <Input
          type="text"
          className="w-full grow border-none outline-none bg-transparent "
          placeholder="bsky.app/post-url"
          value={urlValue}
          disabled={isLocked}
          onChange={(e) => setUrlValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              submit();
            }
            if (
              e.key === "Backspace" &&
              !e.currentTarget.value &&
              urlValue !== ""
            ) {
              e.preventDefault();
              console.log("hello!");
            }
          }}
        />
        <button
          type="submit"
          id="bluesky-post-block-submit"
          className={`p-1 ${isSelected && !isLocked ? "text-accent-contrast" : "text-border"}`}
          onMouseDown={(e) => {
            e.preventDefault();
            errorSmokers(e.clientX + 12, e.clientY);
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
async function getBlueskyPost(uri: string, notFoundSmoker: () => void) {
  const agent = new AtpAgent({ service: "https://public.api.bsky.app" });
  try {
    let blueskyPost = await agent
      .getPostThread({
        uri: uri,
        depth: 0,
        parentHeight: 0,
      })
      .then((res) => {
        return res;
      });
    return blueskyPost;
  } catch (error) {
    let rect = document;
    notFoundSmoker();
    return;
  }
}
