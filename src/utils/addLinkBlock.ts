import {
  LinkPreviewBody,
  LinkPreviewImageResult,
  LinkPreviewMetadataResult,
} from "app/api/link_previews/route";
import { Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";

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
        type: "text",
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
          type: "text",
          value: data.data.data.title || "",
        },
      });
      await rep?.mutate.assertFact({
        entity: entityID,
        attribute: "link/description",
        data: {
          type: "text",
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
