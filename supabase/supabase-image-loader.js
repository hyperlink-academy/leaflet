export default function supabaseLoader({ src, width, quality }) {
  const path = src.startsWith("/") ? src.slice(1) : src;
  return `${process.env.NEXT_PUBLIC_SUPABASE_API_URL}/storage/v1/render/image/public/${path}?width=${width}&quality=${quality || 75}`;
}
