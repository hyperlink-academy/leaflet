import {
  LinkPreviewBody,
  LinkPreviewImageResult,
  LinkPreviewMetadataResult,
} from "app/api/link_previews/route";
import { Replicache } from "replicache";
import type { ReplicacheMutators } from "src/replicache";
import { AtpAgent } from "@atproto/api";
import { v7 } from "uuid";

export async function addLinkBlock(
  url: string,
  entityID: string,
  rep?: Replicache<ReplicacheMutators> | null,
) {
  if (!rep) return;

  await rep?.mutate.assertFact([
    {
      entity: entityID,
      attribute: "link/url",
      data: {
        type: "string",
        value: url,
      },
    },
    {
      entity: entityID,
      attribute: "block/type",
      data: { type: "block-type-union", value: "link" },
    },
  ]);
  fetch("/api/link_previews", {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({ url, type: "meta" } as LinkPreviewBody),
  }).then(async (res) => {
    let data = await (res.json() as LinkPreviewMetadataResult);
    if (data.success) {
      await rep?.mutate.assertFact({
        entity: entityID,
        attribute: "link/title",
        data: {
          type: "string",
          value: data.data.data.title || "",
        },
      });
      await rep?.mutate.assertFact({
        entity: entityID,
        attribute: "link/description",
        data: {
          type: "string",
          value: data.data.data.description || "",
        },
      });
    }
  });

  fetch("/api/link_previews", {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({ url, type: "image" } as LinkPreviewBody),
  }).then(async (res) => {
    let data = await (res.json() as LinkPreviewImageResult);

    await rep?.mutate.assertFact({
      entity: entityID,
      attribute: "link/preview",
      data: {
        fallback: "",
        type: "image",
        src: data.url,
        width: data.width,
        height: data.height,
      },
    });
  });
}

export async function addBlueskyPostBlock(
  url: string,
  entityID: string,
  rep: Replicache<ReplicacheMutators>,
) {
  //construct bsky post uri from url
  let urlParts = url?.split("/");
  let userDidOrHandle = urlParts ? urlParts[4] : ""; // "schlage.town" or "did:plc:jjsc5rflv3cpv6hgtqhn2dcm"
  let collection = "app.bsky.feed.post";
  let postId = urlParts ? urlParts[6] : "";
  let uri = `at://${userDidOrHandle}/${collection}/${postId}`;

  let post = await getBlueskyPost(uri);
  if (!post || post === undefined) return false;

  await rep.mutate.assertFact({
    entity: entityID,
    attribute: "block/type",
    data: { type: "block-type-union", value: "bluesky-post" },
  });
  await rep?.mutate.assertFact({
    entity: entityID,
    attribute: "block/bluesky-post",
    data: {
      type: "bluesky-post",
      //TODO: this is a hack to get rid of a nested Array buffer which cannot be frozen, which replicache does on write.
      value: JSON.parse(JSON.stringify(post.data.thread)),
    },
  });
  return true;
}
async function getBlueskyPost(uri: string) {
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
    return;
  }
}
