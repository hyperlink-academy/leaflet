import { snapToImageWidth } from "./imageSizes";

export default function supabaseLoader({ src, width, quality }) {
  const path = src.startsWith("/") ? src.slice(1) : src;
  // Resize through our own sharp-backed proxy rather than Supabase's
  // render/image endpoint, which bills every distinct origin image
  // transformed each month. The proxy scales proportionally to `width` and
  // never upscales, matching the previous resize=contain behavior (see #286).
  return `/api/resized_images?path=${encodeURIComponent(path)}&width=${snapToImageWidth(width)}`;
}
