import { encodeBitmapToWebP } from "./encodeBitmapToWebP";

const MAX_ICON_DIMENSION = 144;

export async function prepareIconFile(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    const blob = await encodeBitmapToWebP(bitmap, {
      quality: 0.9,
      maxDimension: MAX_ICON_DIMENSION,
    });
    return new File([blob], "icon.webp", { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}
