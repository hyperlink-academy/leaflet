// Tier descriptions (publication_membership_tiers.description) hold either
// legacy plain text or a serialized ProseMirror doc (JSON produced by
// TierDescriptionEditor). Everything that reads the column goes through these
// helpers so both formats keep working.

export type TierDescriptionMark = {
  type: string;
  attrs?: { href?: string };
};

export type TierDescriptionInline = {
  type: string;
  text?: string;
  marks?: TierDescriptionMark[];
};

export type TierDescriptionParagraph = {
  type: string;
  content?: TierDescriptionInline[];
};

export type TierDescriptionDoc = {
  type: "doc";
  content: TierDescriptionParagraph[];
};

export function parseTierDescriptionDoc(
  description: string | null | undefined,
): TierDescriptionDoc | null {
  if (!description || description[0] !== "{") return null;
  try {
    let doc = JSON.parse(description);
    if (doc && doc.type === "doc" && Array.isArray(doc.content))
      return doc as TierDescriptionDoc;
  } catch {}
  return null;
}

// Plain-text projection of a description, e.g. for the Stripe product
// description. Legacy plain-text values pass through unchanged.
export function tierDescriptionPlainText(
  description: string | null | undefined,
): string {
  let doc = parseTierDescriptionDoc(description);
  if (!doc) return description ?? "";
  return doc.content
    .map((p) =>
      (p.content ?? [])
        .map((n) => (n.type === "hard_break" ? "\n" : (n.text ?? "")))
        .join(""),
    )
    .join("\n")
    .trim();
}
