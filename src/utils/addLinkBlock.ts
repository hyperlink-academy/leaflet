import { addLinkCard } from "actions/addLinkCard";
import { Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";

export async function addLinkBlock(
  url: string,
  entityID: string,
  rep?: Replicache<ReplicacheMutators> | null,
) {
  if (!rep) return;
  let data = await addLinkCard({ link: url });
  if (data.success) {
    await rep.mutate.assertFact({
      entity: entityID,
      attribute: "block/type",
      data: { type: "block-type-union", value: "link" },
    });
    await rep?.mutate.assertFact({
      entity: entityID,
      attribute: "link/preview",
      data: {
        fallback: "",
        type: "image",
        src: data.data.data.screenshot.url,
        width: data.data.data.screenshot.width,
        height: data.data.data.screenshot.height,
      },
    });
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
    await rep?.mutate.assertFact({
      entity: entityID,
      attribute: "link/url",
      data: {
        type: "text",
        value: url,
      },
    });
  }
}
