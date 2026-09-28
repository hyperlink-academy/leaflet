import { describe, expect, test } from "vitest";
import { isPendingBlob, resolveBlobLinks } from "./resolveBlobLinks";

const pending = (url: string) => ({
  $type: "blob" as const,
  ref: { $link: url },
  mimeType: "image/*",
  size: 0,
});
const uploaded = (cid: string) => ({
  $type: "blob" as const,
  ref: { $link: cid },
  mimeType: "image/jpeg",
  size: 10,
});

describe("resolveBlobLinks", () => {
  test("replaces http-linked blobs anywhere in the record, leaving cids alone", async () => {
    const record = {
      coverImage: pending("https://x/a.jpg"),
      content: {
        pages: [
          { blocks: [{ block: { image: pending("https://x/b.jpg") } }] },
          { blocks: [{ block: { image: uploaded("bafyold") } }] },
        ],
      },
      title: "t",
    };
    const calls: string[] = [];
    const { record: out, resolved } = await resolveBlobLinks(
      record,
      async (url) => {
        calls.push(url);
        return uploaded(url.endsWith("a.jpg") ? "bafya" : "bafyb");
      },
    );
    expect(resolved).toBe(2);
    expect(calls).toEqual(["https://x/a.jpg", "https://x/b.jpg"]);
    expect(out.coverImage.ref.$link).toBe("bafya");
    expect(out.content.pages[0].blocks[0].block.image.ref.$link).toBe("bafyb");
    expect(out.content.pages[1].blocks[0].block.image).toEqual(
      uploaded("bafyold"),
    );
    expect(out.title).toBe("t");
    expect(record.coverImage.ref.$link).toBe("https://x/a.jpg");
  });

  test("keeps a reference the resolver declines", async () => {
    const record = { image: pending("https://gated/x.jpg") };
    const { record: out, resolved } = await resolveBlobLinks(
      record,
      async () => undefined,
    );
    expect(resolved).toBe(0);
    expect(out).toEqual(record);
  });

  test("isPendingBlob only matches http links", () => {
    expect(isPendingBlob(pending("http://x/y"))).toBe(true);
    expect(isPendingBlob(uploaded("bafy"))).toBe(false);
    expect(isPendingBlob({ ref: { $link: "https://x" } })).toBe(false);
    expect(isPendingBlob(null)).toBe(false);
  });
});
