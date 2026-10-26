import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { encodeImageVariant } from "./serverImageEncoding";

const resize = (width: number) =>
  ({ width, fit: "inside", withoutEnlargement: true }) as const;

const toEmail = (input: Buffer) =>
  encodeImageVariant(input, { format: "email", resize: resize(1200) });

function photo(width: number, height: number) {
  const raw = Buffer.alloc(width * height * 3);
  let seed = 1;
  for (let i = 0; i < raw.length; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const x = Math.floor(i / 3) % width;
    const y = Math.floor(i / 3 / width);
    const grain = ((seed >>> 24) - 128) * 0.35;
    raw[i] = Math.min(
      255,
      Math.max(0, ((x + y) / (width + height)) * 200 + grain + 28),
    );
  }
  return sharp(raw, { raw: { width, height, channels: 3 } });
}

function flat(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: "#f4f1ea" },
  }).composite([
    {
      input: {
        create: { width: 100, height: 20, channels: 3, background: "#222" },
      },
      left: 10,
      top: 10,
    },
  ]);
}

describe("encodeImageVariant email", () => {
  it("turns a photographic PNG into JPEG", async () => {
    const input = await photo(1600, 1000).png().toBuffer();
    const out = await toEmail(input);
    expect(out?.format).toBe("jpeg");
    expect(out!.data.length).toBeLessThan(input.length);
  });

  it("keeps a flat PNG as PNG", async () => {
    const input = await flat(1600, 1000).png().toBuffer();
    const out = await toEmail(input);
    expect(out?.format).toBe("png");
  });

  it("keeps real transparency as PNG", async () => {
    const input = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 0.5 },
      },
    })
      .webp()
      .toBuffer();
    const out = await toEmail(input);
    expect(out?.format).toBe("png");
  });

  it("transcodes WebP even when no resize happens", async () => {
    const input = await photo(400, 300).webp().toBuffer();
    const out = await toEmail(input);
    expect(out?.format).toBe("jpeg");
  });

  it("serves an email-safe source within the size as-is", async () => {
    const input = await photo(800, 600)
      .jpeg({ quality: 60, mozjpeg: true })
      .toBuffer();
    const out = await toEmail(input);
    expect(out).toBeNull();
  });

  it("downscales a JPEG source without growing it", async () => {
    const input = await photo(2400, 1600).jpeg({ quality: 80 }).toBuffer();
    const out = await toEmail(input);
    expect(out?.format).toBe("jpeg");
    const meta = await sharp(out!.data).metadata();
    expect(meta.width).toBe(1200);
    expect(out!.data.length).toBeLessThan(input.length / 2);
  });

  it("encodes a CMYK JPEG", async () => {
    const input = await photo(1600, 1000)
      .toColourspace("cmyk")
      .jpeg()
      .toBuffer();
    expect((await toEmail(input))?.format).toBe("jpeg");
  });

  it("bakes in EXIF orientation instead of serving the original", async () => {
    const input = await photo(400, 300)
      .jpeg({ quality: 60, mozjpeg: true })
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const out = await toEmail(input);
    expect(await sharp(out!.data).metadata()).toMatchObject({
      width: 300,
      height: 400,
    });
  });

  it("keeps an animated GIF animated", async () => {
    const frame = (background: string) =>
      sharp({ create: { width: 40, height: 40, channels: 3, background } })
        .png()
        .toBuffer();
    const input = await sharp([await frame("#09f"), await frame("#f90")], {
      join: { animated: true },
    })
      .gif()
      .toBuffer();
    const out = await toEmail(input);
    const result = out?.data ?? input;
    const meta = await sharp(result, { animated: true }).metadata();
    expect(meta.format).toBe("gif");
    expect(meta.pages).toBe(2);
  });
});

describe("encodeImageVariant web", () => {
  it("re-encodes a PNG source as WebP", async () => {
    const input = await photo(1600, 1000).png().toBuffer();
    const out = await encodeImageVariant(input, { resize: resize(1200) });
    expect(out?.format).toBe("webp");
    expect(out!.data.length).toBeLessThan(input.length);
  });

  it("re-encodes a JPEG source as WebP", async () => {
    const input = await photo(1600, 1000).jpeg({ quality: 90 }).toBuffer();
    const out = await encodeImageVariant(input, { resize: resize(1200) });
    expect(out?.format).toBe("webp");
  });
});
