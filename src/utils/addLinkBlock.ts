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

  let res = await fetch("/api/link_previews", {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({ url, type: "meta" } as LinkPreviewBody),
  });
  if (res.status !== 200) {
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
    return;
  }
  let data = await (res.json() as LinkPreviewMetadataResult);
  if (!data.success) {
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
    return;
  }

  if (data.data.links?.player?.[0]) {
    let embed = data.data.links?.player?.[0];
    await rep.mutate.assertFact([
      {
        entity: entityID,
        attribute: "block/type",
        data: { type: "block-type-union", value: "embed" },
      },
      {
        entity: entityID,
        attribute: "embed/url",
        data: {
          type: "string",
          value: embed.href,
        },
      },
      {
        entity: entityID,
        attribute: "embed/height",
        data: {
          type: "number",
          value: embed.media?.height || 300,
        },
      },
    ]);
    return;
  }
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
    {
      entity: entityID,
      attribute: "link/title",
      data: {
        type: "string",
        value: data.data.meta?.title || "",
      },
    },
    {
      entity: entityID,
      attribute: "link/description",
      data: {
        type: "string",
        value: data.data.meta?.description || "",
      },
    },
  ]);
  let imageRes = await fetch("/api/link_previews", {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({ url, type: "image" } as LinkPreviewBody),
  });

  let image_data = await (imageRes.json() as LinkPreviewImageResult);

  await rep?.mutate.assertFact({
    entity: entityID,
    attribute: "link/preview",
    data: {
      fallback: "",
      type: "image",
      src: image_data.url,
      width: image_data.width,
      height: image_data.height,
    },
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
