const projectId = "bdefzwcumgzjwllsnaej"; // your supabase project id

export default function supabaseLoader({ src, width, quality }) {
  return `https://${projectId}.supabase.co/storage/v1/render/image/public/${src}?width=${width}&quality=${quality || 75}`;
}
