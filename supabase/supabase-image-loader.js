export default function supabaseLoader({ src, width, quality }) {
  const path = src.startsWith("/") ? src.slice(1) : src;
  // resize=contain scales proportionally to fit `width`. Without it Supabase
  // defaults to resize=cover, and since next/image only passes width (no
  // height), imgproxy fills the missing height with the source height and crops
  // the width to fit — chopping the right side off large images. See #286.
  return `${process.env.NEXT_PUBLIC_SUPABASE_API_URL}/storage/v1/render/image/public/${path}?width=${width}&quality=${quality || 75}&resize=contain`;
}
