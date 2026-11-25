import { afterEach, describe, expect, it, vi } from "vitest";
import { BlobRef } from "@atproto/lexicon";
import { CID } from "multiformats/cid";
import { documentRecordForPDS } from "./documentRecordForPDS";

const DELIMITER = "pub.leaflet.blocks.membersOnlyDelimiter";
const PDS_CID = "bafkreie5737gdxlw5i64vzichcalba3z2v5n6icifvx5xytvske7mr3hpm";
const UPLOADED_CID =
  "bafkreibme22gw2h7y2h7tg2fhqotaqjucnbc24deqo72b6mkl2egezxhvy";

const image = (ref: unknown) => ({
  block: {
    $type: "pub.leaflet.blocks.image",
    image: ref,
    aspectRatio: { width: 1, height: 1 },
  },
});

function record(widerReleaseAt?: string) {
  return {
    $type: "pub.leaflet.document",
    publication: "at://did:plc:a/pub.leaflet.publication/p",
    pages: [
      {
        $type: "pub.leaflet.pages.linearDocument",
        blocks: [
          image(new BlobRef(CID.parse(PDS_CID), "image/png", 10)),
          {
            block: {
              $type: DELIMITER,
              audience: { $type: "pub.leaflet.audience#paid" },
              ...(widerReleaseAt && {
                widerReleaseAt,
                widerReleaseAudience: { $type: "pub.leaflet.audience#public" },
              }),
            },
          },
          // A members-only image as stored before refs carried $type.
          image({
            ref: { $link: "https://storage.example/gated.png" },
            mimeType: "image/*",
            size: 0,
          }),
        ],
      },
    ],
  };
}

function fakeAgent() {
  const uploadBlob = vi.fn(async () => ({
    data: {
      blob: new BlobRef(CID.parse(UPLOADED_CID), "image/png", 20),
    },
  }));
  return {
    agent: { com: { atproto: { repo: { uploadBlob } } } } as any,
    uploadBlob,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("documentRecordForPDS", () => {
  it("cuts a gated post off at the delimiter without uploading anything", async () => {
    const { agent, uploadBlob } = fakeAgent();
    const out: any = await documentRecordForPDS(record(), agent);
    expect(out.pages[0].blocks).toHaveLength(2);
    expect(out.pages[0].blocks[0].block.image).toBeInstanceOf(BlobRef);
    expect(uploadBlob).not.toHaveBeenCalled();
  });

  it("keeps everything after a public wider release, uploading members-only images", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Blob(["png"], { type: "image/png" }))),
    );
    const { agent, uploadBlob } = fakeAgent();
    const out: any = await documentRecordForPDS(
      record("2020-01-01T00:00:00.000Z"),
      agent,
    );
    const blocks = out.pages[0].blocks;
    expect(blocks).toHaveLength(3);
    expect(uploadBlob).toHaveBeenCalledTimes(1);
    expect(blocks[0].block.image.ref.toString()).toBe(PDS_CID);
    expect(blocks[2].block.image).toBeInstanceOf(BlobRef);
    expect(blocks[2].block.image.ref.toString()).toBe(UPLOADED_CID);
  });
});
