import { addLinkCard } from "actions/addLinkCard";
import { Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";

export async function addLinkBlock(
  url: string,
  entityID: string,
  rep?: Replicache<ReplicacheMutators> | null,
) {
  if (!rep) return;
  await rep.mutate.assertFact({
    entity: entityID,
    attribute: "block/type",
    data: { type: "block-type-union", value: "link" },
  });
  await rep?.mutate.assertFact({
    entity: entityID,
    attribute: "link/url",
    data: {
      type: "text",
      value: url,
    },
  });
  await rep?.mutate.assertFact({
    entity: entityID,
    attribute: "link/preview",
    data: {
      fallback: "",
      type: "image",
      src: `/api/link-preview-proxy?url=${url}`,
      width: 1920,
      height: 1080,
    },
  });
  let data = await addLinkCard({ link: url });
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
}
