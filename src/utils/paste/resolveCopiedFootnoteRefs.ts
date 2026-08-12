// Leaflet's own clipboard HTML marks a footnote as <span class="footnote-ref"
// data-footnote-id> (schema toDOM for in-block copies, RenderYJSFragment for
// block copies). Pasting that span as-is would parse into a footnote node
// aliasing the source block's entity — the pasted ref renders as a working
// footnote, but deleting it deletes the entity out from under the original
// (the data-loss bug this file exists to prevent). Before blocks are built,
// normalize every such ref to the shape external markdown footnotes take
// (only data-footnote-def), from which the builder mints a fresh entity.
// Refs that carry no definition (older copies, in-block copies) get one from
// the local replicache via getDefHTML; refs whose entity can't be found
// (cross-leaflet paste) are dropped rather than left aliasing.
const INTERNAL_REF_SELECTOR = "span.footnote-ref[data-footnote-id]";

export async function resolveCopiedFootnoteRefs(
  children: HTMLElement[],
  getDefHTML: (footnoteEntityID: string) => Promise<string | null>,
) {
  const refs = children.flatMap((child) => {
    const within = Array.from(
      child.querySelectorAll(INTERNAL_REF_SELECTOR),
    ) as HTMLElement[];
    // Flattening can leave an inline run's wrapper span as a child itself.
    if (child.matches?.(INTERNAL_REF_SELECTOR)) within.push(child);
    return within;
  });
  if (refs.length === 0) return;

  const defs = new Map<string, string | null>();
  for (const ref of refs) {
    const id = ref.getAttribute("data-footnote-id")!;
    if (ref.hasAttribute("data-footnote-def")) continue;
    if (!defs.has(id)) defs.set(id, await getDefHTML(id));
  }

  for (const ref of refs) {
    const id = ref.getAttribute("data-footnote-id")!;
    ref.removeAttribute("data-footnote-id");
    ref.classList.remove("footnote-ref");
    if (ref.classList.length === 0) ref.removeAttribute("class");
    if (ref.hasAttribute("data-footnote-def")) continue;
    const def = defs.get(id);
    if (def == null) ref.remove();
    else ref.setAttribute("data-footnote-def", def);
  }
}
