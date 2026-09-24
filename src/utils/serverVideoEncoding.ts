import { execFile } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import sharp from "sharp";

// Animated GIFs are decoded frame by frame on the CPU for as long as they are
// on screen (a large one costs a fifth of a core continuously, and the decode
// competes with canvas raster during zooms), while a muted looping <video> is
// hardware decoded and never touches the raster path. This turns a GIF into an
// H.264 MP4 the same way the image proxy mints resized variants: once, stored,
// then served from the CDN.

// Sources above this are refused rather than transcoded inside a request.
const MAX_INPUT_BYTES = 40 * 1024 * 1024;
const MAX_WIDTH = 2000;
// Leaves room inside the route's 60s budget for fetching the source and
// storing the result, so the invocation always reaches its cleanup.
const TIMEOUT_MS = 30_000;

function ffmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    let p = require("ffmpeg-static") as string | null;
    if (p) return p;
  } catch {}
  return "ffmpeg";
}

// True for a GIF with more than one frame; a still or another format has
// nothing to gain from a video.
async function isAnimatedGif(input: Buffer) {
  let metadata = await sharp(input).metadata();
  return metadata.format === "gif" && (metadata.pages ?? 1) > 1;
}

// H.264 in MP4 is the one combination every browser plays inline, including
// iOS Safari. yuv420p and even dimensions are what that decoder support
// requires; faststart puts the index first so playback starts before the
// download finishes. GIF transparency is flattened onto black, and the source
// frame rate is kept.
export async function transcodeGifToMp4(
  input: Buffer,
): Promise<{ data: Buffer; format: "mp4" } | null> {
  if (input.length > MAX_INPUT_BYTES) return null;
  if (!(await isAnimatedGif(input))) return null;
  let dir = await mkdtemp(path.join(tmpdir(), "gif2mp4-"));
  let inPath = path.join(dir, "in.gif");
  let outPath = path.join(dir, "out.mp4");
  try {
    await writeFile(inPath, input);
    await new Promise<void>((resolve, reject) => {
      // The binary path is only known at runtime, which would make Turbopack
      // trace the whole project; next.config.js's outputFileTracingIncludes
      // ships the binary instead.
      execFile(
        /*turbopackIgnore: true*/ ffmpegPath(),
        [
          "-v", "error", "-y",
          "-i", inPath,
          "-an",
          "-c:v", "libx264",
          "-preset", "veryfast",
          "-crf", "23",
          "-pix_fmt", "yuv420p",
          "-movflags", "+faststart",
          "-vf", `scale=trunc(min(iw\\,${MAX_WIDTH})/2)*2:-2`,
          outPath,
        ],
        { timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024 },
        (error, _stdout, stderr) => {
          if (error) reject(new Error(`ffmpeg: ${stderr || error.message}`));
          else resolve();
        },
      );
    });
    return { data: await readFile(outPath), format: "mp4" };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
