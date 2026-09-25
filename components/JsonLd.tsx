// Escaping "<" keeps user-provided strings (e.g. "</script>" in a post title)
// from closing the script tag and injecting markup.
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
