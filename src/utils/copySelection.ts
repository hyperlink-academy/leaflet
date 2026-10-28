import type { copyBlocks } from "src/utils/getBlocksAsHTML";

// Loaded on the copy gesture: the conversion pulls katex and the markdown
// pipeline, which no page load should pay for.
export async function copySelection(...args: Parameters<typeof copyBlocks>) {
  let { copyBlocks } = await import("src/utils/getBlocksAsHTML");
  await copyBlocks(...args);
}
