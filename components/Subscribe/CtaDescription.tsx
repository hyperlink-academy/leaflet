// Each line the writer typed is its own paragraph; blank lines don't add
// extra space.
export function CtaDescription(props: { text: string; className?: string }) {
  let paragraphs = props.text
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div className={`flex flex-col gap-2 ${props.className ?? ""}`}>
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
